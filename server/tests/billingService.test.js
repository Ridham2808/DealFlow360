const request = require('supertest');
const app = require('../app');
const prisma = require('../prisma/prisma');
const billingService = require('../services/billingService');
const { generateToken } = require('../utils/tokenHelper');

describe('Hybrid Billing & Subscription Lifecycle Integration Suite', () => {
  let adminUser;
  let financeUser;
  let repUser;
  let customerAcme;
  let hardwareProduct;
  let subscriptionProduct;
  let subscriptionPlanMonthly;
  let financeToken;

  beforeAll(async () => {
    [adminUser, financeUser, repUser] = await Promise.all([
      prisma.user.findUnique({ where: { email: 'admin@dealflow360.com' } }),
      prisma.user.findUnique({ where: { email: 'finance@dealflow360.com' } }),
      prisma.user.findUnique({ where: { email: 'rep@dealflow360.com' } }),
    ]);

    financeToken = generateToken({ userId: financeUser.id, email: financeUser.email, role: financeUser.role });
    customerAcme = await prisma.customer.findUnique({ where: { email: 'contact@acmecorp.com' } });

    hardwareProduct = await prisma.product.findFirst({ where: { category: 'Hardware' } });

    // Ensure subscription plan exists
    subscriptionPlanMonthly = await prisma.subscriptionPlan.findFirst({
      where: { billingCycle: 'MONTHLY' },
    });

    if (!subscriptionPlanMonthly) {
      subscriptionPlanMonthly = await prisma.subscriptionPlan.create({
        data: {
          name: 'Standard Cloud SaaS',
          billingCycle: 'MONTHLY',
          price: 150.0,
        },
      });
    }

    subscriptionProduct = await prisma.product.findFirst({ where: { isRecurringEligible: true } });
    if (!subscriptionProduct) {
      subscriptionProduct = await prisma.product.create({
        data: {
          name: 'Cloud Maintenance Plan',
          sku: `SKU-SUB-${Date.now()}`,
          category: 'Services',
          basePrice: 150.0,
          baseCost: 30.0,
          isRecurringEligible: true,
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('generates one ONE_TIME invoice and separate BillingSchedules without combining them into ambiguous amounts', async () => {
    const quote = await prisma.quotation.create({
      data: {
        quoteNumber: `BILL-HYBRID-${Date.now()}`,
        customerId: customerAcme.id,
        ownerRepId: repUser.id,
        status: 'APPROVED',
        subtotal: 3500.0,
        grandTotal: 3500.0,
        lines: {
          create: [
            // One-time hardware line
            {
              productId: hardwareProduct.id,
              productNameSnapshot: hardwareProduct.name,
              categorySnapshot: 'Hardware',
              quantity: 2,
              unitPrice: 1000.0,
              unitCost: 500.0,
              lineSubtotal: 2000.0,
              lineMargin: 1000.0,
              isRecurring: false,
            },
            // Recurring subscription line
            {
              productId: subscriptionProduct.id,
              productNameSnapshot: subscriptionProduct.name,
              categorySnapshot: 'Services',
              quantity: 10,
              unitPrice: 150.0,
              unitCost: 30.0,
              lineSubtotal: 1500.0,
              lineMargin: 1200.0,
              isRecurring: true,
              subscriptionPlanId: subscriptionPlanMonthly.id,
            },
          ],
        },
      },
    });

    const result = await billingService.generateBilling(quote.id, financeUser.id);

    // 1. One-time invoice matches ONLY the hardware line (2000.00)
    expect(result.invoice).toBeDefined();
    expect(result.invoice.type).toBe('ONE_TIME');
    expect(Number(result.invoice.amount)).toBe(2000.0);
    expect(result.invoice.status).toBe('ISSUED');

    // 2. Separate recurring schedule for the subscription line (1500.00)
    expect(result.billingSchedules).toHaveLength(1);
    expect(Number(result.billingSchedules[0].amount)).toBe(1500.0);
    expect(result.billingSchedules[0].status).toBe('ACTIVE');

    // 3. Next bill date is roughly 1 month in the future
    const nextBill = new Date(result.billingSchedules[0].nextBillDate);
    const expectedMonth = (new Date().getMonth() + 1) % 12;
    expect(nextBill.getMonth()).toBe(expectedMonth);

    // 4. Quotation status updated to CONFIRMED
    const updatedQuote = await prisma.quotation.findUnique({ where: { id: quote.id } });
    expect(updatedQuote.status).toBe('CONFIRMED');
  });

  it('records payment and updates invoice status from ISSUED to PAID', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        quotationId: (await prisma.quotation.findFirst()).id,
        invoiceNumber: `TEST-PAY-${Date.now()}`,
        type: 'ONE_TIME',
        amount: 1250.0,
        status: 'ISSUED',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    const paidInvoice = await billingService.recordPayment(invoice.id, {
      amount: 1250.0,
      paymentMethod: 'WIRE_TRANSFER',
      reference: 'TXN-998811',
    }, financeUser.id);

    expect(paidInvoice.status).toBe('PAID');
    expect(paidInvoice.paidAt).toBeDefined();

    // Verify AuditLog
    const audit = await prisma.auditLog.findFirst({
      where: { targetId: invoice.id, action: 'INVOICE_PAYMENT_RECORDED' },
    });
    expect(audit).toBeDefined();
    expect(audit.reasonNote).toContain('WIRE_TRANSFER');
  });

  it('calculates mid-cycle proration when modifying subscription amount', async () => {
    const now = new Date();
    const nextBill = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days left in 30 day cycle (50%)

    const schedule = await prisma.billingSchedule.create({
      data: {
        subscriptionPlanId: subscriptionPlanMonthly.id,
        amount: 100.0,
        nextBillDate: nextBill,
        status: 'ACTIVE',
      },
    });

    // Upgrade subscription amount from $100 to $200 (delta: +$100)
    const result = await billingService.modifySubscription(schedule.id, {
      newAmount: 200.0,
    }, financeUser.id);

    expect(Number(result.schedule.amount)).toBe(200.0);
    expect(result.proration.daysRemaining).toBe(15);
    // 15/30 = 0.5 factor -> $100 * 0.5 = $50 adjustment
    expect(result.proration.priceAdjustment).toBeCloseTo(50.0, 0);
  });

  it('calculates cancellation refund / credit when cancelling a subscription', async () => {
    const nextBill = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000); // 12 days unserved

    const schedule = await prisma.billingSchedule.create({
      data: {
        subscriptionPlanId: subscriptionPlanMonthly.id,
        amount: 300.0,
        nextBillDate: nextBill,
        status: 'ACTIVE',
      },
    });

    const result = await billingService.cancelSubscription(schedule.id, {
      reason: 'Downsizing team size',
    }, financeUser.id);

    expect(result.schedule.status).toBe('CANCELLED');
    expect(result.cancellationCredit.daysRemaining).toBe(12);
    // Daily rate = 300 / 30 = 10 -> 10 * 12 = 120 credit
    expect(result.cancellationCredit.refundAmount).toBe(120.0);
  });

  it('HTTP GET /api/subscriptions and /api/invoices return paginated data with status pills', async () => {
    const subRes = await request(app)
      .get('/api/subscriptions')
      .set('Authorization', `Bearer ${financeToken}`);

    expect(subRes.status).toBe(200);
    expect(subRes.body.data.statusCounts).toBeDefined();
    expect(subRes.body.data.statusCounts).toHaveProperty('active');
    expect(subRes.body.data.statusCounts).toHaveProperty('paused');
    expect(subRes.body.data.statusCounts).toHaveProperty('cancelled');

    const invRes = await request(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${financeToken}`);

    expect(invRes.status).toBe(200);
    expect(invRes.body.data.statusCounts).toBeDefined();
    expect(invRes.body.data.statusCounts).toHaveProperty('unpaid');
    expect(invRes.body.data.statusCounts).toHaveProperty('paid');
  });
});
