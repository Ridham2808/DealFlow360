const request = require('supertest');
const app = require('../app');
const prisma = require('../prisma/prisma');
const dealHealthService = require('../services/dealHealthService');
const { generateToken } = require('../utils/tokenHelper');

describe('Deal Health Telemetry & Anomaly Detection Integration Suite', () => {
  let adminUser;
  let managerUser;
  let repUser;
  let customerAcme;
  let hardwareProduct;
  let managerToken;

  beforeAll(async () => {
    [adminUser, managerUser, repUser] = await Promise.all([
      prisma.user.findUnique({ where: { email: 'admin@dealflow360.com' } }),
      prisma.user.findUnique({ where: { email: 'manager@dealflow360.com' } }),
      prisma.user.findUnique({ where: { email: 'rep@dealflow360.com' } }),
    ]);

    managerToken = generateToken({ userId: managerUser.id, email: managerUser.email, role: managerUser.role });
    customerAcme = await prisma.customer.findUnique({ where: { email: 'contact@acmecorp.com' } });
    hardwareProduct = await prisma.product.findFirst({ where: { category: 'Hardware' } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('scans for stalled deals and stores flags idempotently without duplicates', async () => {
    // Create an inactive quotation updated 10 days ago
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const staleQuote = await prisma.quotation.create({
      data: {
        quoteNumber: `STALL-TEST-${Date.now()}`,
        customerId: customerAcme.id,
        ownerRepId: repUser.id,
        status: 'DRAFT',
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
      },
    });

    // Run scan 1
    const scan1 = await dealHealthService.scanForStalledDeals({ stalledDays: 7 });
    expect(scan1.stalledQuotesFound).toBeGreaterThanOrEqual(1);

    const flagCount1 = await prisma.dealHealthFlag.count({
      where: { quotationId: staleQuote.id, flagType: 'STALLED', isResolved: false },
    });
    expect(flagCount1).toBe(1);

    // Run scan 2 (must be idempotent: no second flag created)
    await dealHealthService.scanForStalledDeals({ stalledDays: 7 });
    const flagCount2 = await prisma.dealHealthFlag.count({
      where: { quotationId: staleQuote.id, flagType: 'STALLED', isResolved: false },
    });
    expect(flagCount2).toBe(1);
  });

  it('detects discount anomaly when rep gives discount materially above historical average', async () => {
    // 1. Establish historical baseline for rep on confirmed quote (e.g. 5% discount)
    await prisma.quotation.create({
      data: {
        quoteNumber: `HIST-CONF-${Date.now()}`,
        customerId: customerAcme.id,
        ownerRepId: repUser.id,
        status: 'CONFIRMED',
        subtotal: 10000.0,
        discountTotal: 500.0, // 5% average
        grandTotal: 9500.0,
      },
    });

    // 2. Rep submits a quote with 28% discount (> 10% threshold above 5%)
    const outlierQuote = await prisma.quotation.create({
      data: {
        quoteNumber: `OUTLIER-${Date.now()}`,
        customerId: customerAcme.id,
        ownerRepId: repUser.id,
        status: 'PENDING_APPROVAL',
        subtotal: 10000.0,
        discountTotal: 2800.0, // 28%
        grandTotal: 7200.0,
        lines: {
          create: [
            {
              productId: hardwareProduct.id,
              quantity: 1,
              unitPrice: 10000.0,
              unitCost: 4000.0,
              discountPercent: 28.0,
              lineSubtotal: 10000.0,
              lineDiscountAmount: 2800.0,
              lineMargin: 3200.0,
              categorySnapshot: 'Hardware',
              productNameSnapshot: hardwareProduct.name,
            },
          ],
        },
      },
    });

    await dealHealthService.detectDiscountAnomalies({ thresholdDelta: 10.0 });

    const flag = await prisma.dealHealthFlag.findFirst({
      where: { quotationId: outlierQuote.id, flagType: 'DISCOUNT_ANOMALY', isResolved: false },
    });

    expect(flag).toBeDefined();
    expect(flag.severity).toBe('HIGH');
    expect(flag.details).toContain('materially above their historical average');
  });

  it('escalateFlag updates severity and creates append-only audit log', async () => {
    const flag = await prisma.dealHealthFlag.create({
      data: {
        quotationId: (await prisma.quotation.findFirst()).id,
        flagType: 'STALLED',
        details: 'Quote stalled in review',
        severity: 'MEDIUM',
      },
    });

    const escalated = await dealHealthService.escalateFlag(flag.id, managerUser.id);
    expect(escalated.severity).toBe('HIGH');

    const audit = await prisma.auditLog.findFirst({
      where: { targetId: flag.id, action: 'DEAL_HEALTH_ESCALATED' },
    });
    expect(audit).toBeDefined();
    expect(audit.actorId).toBe(managerUser.id);
  });

  it('nudgeRep dispatches nudge and records audit log', async () => {
    const quote = await prisma.quotation.findFirst({ include: { ownerRep: true } });
    const flag = await prisma.dealHealthFlag.create({
      data: {
        quotationId: quote.id,
        flagType: 'DISCOUNT_ANOMALY',
        details: 'Outlier discount noted',
        severity: 'HIGH',
      },
    });

    const res = await dealHealthService.nudgeRep(flag.id, managerUser.id);
    expect(res.success).toBe(true);

    const audit = await prisma.auditLog.findFirst({
      where: { targetId: flag.id, action: 'DEAL_HEALTH_REP_NUDGED' },
    });
    expect(audit).toBeDefined();
    expect(audit.actorId).toBe(managerUser.id);
  });

  it('HTTP GET /api/deal-health returns dashboard with 3 telemetry cards and actionable table', async () => {
    const res = await request(app)
      .get('/api/deal-health')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cards).toBeDefined();
    expect(res.body.data.cards).toHaveProperty('stalledDeals');
    expect(res.body.data.cards).toHaveProperty('discountAnomalies');
    expect(res.body.data.cards).toHaveProperty('deliverySlippage');
    expect(Array.isArray(res.body.data.table)).toBe(true);
  });
});
