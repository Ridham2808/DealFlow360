const request = require('supertest');
const app = require('../app');
const prisma = require('../prisma/prisma');
const { generateToken } = require('../utils/tokenHelper');

describe('End-to-End Quote-to-Cash Transaction Flow', () => {
  let repUser;
  let managerUser;
  let financeUser;
  let customerAcme;
  let hardwareProduct;
  let subscriptionProduct;
  let subscriptionPlan;
  let warehouseEast;

  let repToken;
  let managerToken;
  let financeToken;

  beforeAll(async () => {
    [repUser, managerUser, financeUser] = await Promise.all([
      prisma.user.findUnique({ where: { email: 'rep@dealflow360.com' } }),
      prisma.user.findUnique({ where: { email: 'manager@dealflow360.com' } }),
      prisma.user.findUnique({ where: { email: 'finance@dealflow360.com' } }),
    ]);

    repToken = generateToken({ userId: repUser.id, email: repUser.email, role: repUser.role });
    managerToken = generateToken({ userId: managerUser.id, email: managerUser.email, role: managerUser.role });
    financeToken = generateToken({ userId: financeUser.id, email: financeUser.email, role: financeUser.role });

    customerAcme = await prisma.customer.findUnique({ where: { email: 'contact@acmecorp.com' } });
    hardwareProduct = await prisma.product.findFirst({ where: { category: 'Hardware' } });
    subscriptionProduct = await prisma.product.findFirst({ where: { isRecurringEligible: true } });
    subscriptionPlan = await prisma.subscriptionPlan.findFirst({ where: { billingCycle: 'MONTHLY' } });
    warehouseEast = await prisma.warehouse.findFirst();

    // Ensure warehouse has plenty of stock for hardwareProduct
    await prisma.stockLevel.upsert({
      where: { warehouseId_productId: { warehouseId: warehouseEast.id, productId: hardwareProduct.id } },
      create: { warehouseId: warehouseEast.id, productId: hardwareProduct.id, quantityOnHand: 100, reserved: 0 },
      update: { quantityOnHand: { increment: 50 } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('completes the entire quote-to-cash pipeline: Draft -> Submit -> Approvals -> Fulfillment -> Hybrid Billing -> Payment', async () => {
    // Step 1: Create quotation with Hardware (one-time) and Subscription (recurring)
    // 22% discount on hardware triggers approval chain
    const quote = await prisma.quotation.create({
      data: {
        quoteNumber: `E2E-FLOW-${Date.now()}`,
        customerId: customerAcme.id,
        ownerRepId: repUser.id,
        status: 'DRAFT',
        subtotal: 3500.0,
        discountTotal: 440.0,
        grandTotal: 3060.0,
        lines: {
          create: [
            {
              productId: hardwareProduct.id,
              productNameSnapshot: hardwareProduct.name,
              categorySnapshot: 'Hardware',
              quantity: 2,
              unitPrice: 1000.0,
              unitCost: 500.0,
              discountPercent: 22.0, // Exceeds Gold 15% ceiling
              lineSubtotal: 2000.0,
              lineDiscountAmount: 440.0,
              lineMargin: 1060.0,
              isRecurring: false,
            },
            {
              productId: subscriptionProduct.id,
              productNameSnapshot: subscriptionProduct.name,
              categorySnapshot: 'Services',
              quantity: 1,
              unitPrice: 1500.0,
              unitCost: 300.0,
              discountPercent: 0.0,
              lineSubtotal: 1500.0,
              lineDiscountAmount: 0.0,
              lineMargin: 1200.0,
              isRecurring: true,
              subscriptionPlanId: subscriptionPlan.id,
            },
          ],
        },
      },
      include: { lines: true },
    });

    expect(quote.status).toBe('DRAFT');

    // Step 2: Submit quotation for approval
    const submitRes = await request(app)
      .post(`/api/quotations/${quote.id}/submit`)
      .set('Authorization', `Bearer ${repToken}`)
      .send();

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.quotation.status).toBe('PENDING_APPROVAL');
    const steps = submitRes.body.data.approvalSteps;
    expect(steps.length).toBeGreaterThanOrEqual(1);

    // Step 3: Approve all required approval steps
    for (const step of steps) {
      const token = step.requiredRole === 'FINANCE' ? financeToken : managerToken;
      const actionRes = await request(app)
        .post(`/api/approvals/${step.id}/action`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          action: 'APPROVED',
          notes: `Step ${step.stepOrder} approved in E2E test.`,
        });

      expect(actionRes.status).toBe(200);
    }

    // Verify quote is now APPROVED
    const approvedQuote = await prisma.quotation.findUnique({ where: { id: quote.id } });
    expect(approvedQuote.status).toBe('APPROVED');

    // Step 4: Accept fulfillment split
    const fulfillRes = await request(app)
      .post(`/api/fulfillment/${quote.id}/accept`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send();

    expect(fulfillRes.status).toBe(200);
    expect(fulfillRes.body.data.splits.length).toBeGreaterThan(0);

    // Step 5: Generate hybrid billing
    const billingRes = await request(app)
      .post(`/api/billing/quotations/${quote.id}/generate`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send();

    expect(billingRes.status).toBe(200);
    expect(billingRes.body.data.invoice).toBeDefined();
    expect(billingRes.body.data.invoice.type).toBe('ONE_TIME');
    expect(billingRes.body.data.billingSchedules).toHaveLength(1);

    const generatedInvoice = billingRes.body.data.invoice;

    // Step 6: Record payment on the one-time invoice
    const payRes = await request(app)
      .post(`/api/invoices/${generatedInvoice.id}/payment`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        amount: generatedInvoice.amount,
        paymentMethod: 'CREDIT_CARD',
        reference: 'AUTH-CC-4482',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.status).toBe('PAID');
    expect(payRes.body.data.paidAt).toBeDefined();

    // Step 7: Complete audit timeline validation
    const auditLogs = await prisma.auditLog.findMany({
      where: { quotationId: quote.id },
      orderBy: { createdAt: 'asc' },
    });

    const actions = auditLogs.map((l) => l.action);
    expect(actions).toContain('SUBMITTED_FOR_APPROVAL');
    expect(actions).toContain('APPROVAL_STEP_APPROVED');
    expect(actions).toContain('FULFILLMENT_SPLIT_ACCEPTED');
    expect(actions).toContain('HYBRID_BILLING_GENERATED');
    expect(actions).toContain('INVOICE_PAYMENT_RECORDED');
  });
});
