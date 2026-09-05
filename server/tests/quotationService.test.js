const request = require('supertest');
const app = require('../app');
const prisma = require('../prisma/prisma');
const authService = require('../services/authService');

describe('Quotation Service & Authoritative Engine', () => {
  let repToken;
  let repUser;
  let customer;
  let testHardwareProduct;
  let createdQuoteId;
  let createdLineId;
  let currentQuoteVersion;

  beforeAll(async () => {
    repUser = await prisma.user.findFirst({ where: { role: 'SALES_REP' } });
    const { token } = await authService.login(repUser.email, 'Password123!');
    repToken = token;

    customer = await prisma.customer.findFirst({ where: { tier: 'BRONZE' } });

    // Create a predictable hardware test product
    testHardwareProduct = await prisma.product.create({
      data: {
        name: `Precision Testing Workstation ${Date.now()}`,
        sku: `WRK-TST-${Date.now()}`,
        category: 'HARDWARE',
        basePrice: 1000.0,
        baseCost: 600.0, // 40% margin
        taxPercent: 10.0,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    if (createdQuoteId) {
      await prisma.approvalStep.deleteMany({
        where: { quotationId: createdQuoteId },
      });
      await prisma.quotationLine.deleteMany({
        where: { quotationId: createdQuoteId },
      });
      await prisma.auditLog.deleteMany({
        where: { quotationId: createdQuoteId },
      });
      await prisma.quotation.deleteMany({
        where: { id: createdQuoteId },
      });
    }
    if (testHardwareProduct?.id) {
      await prisma.product.deleteMany({
        where: { id: testHardwareProduct.id },
      });
    }
  });

  describe('Quotation Lifecycle and Authoritative Calculations', () => {
    test('POST /api/quotations creates a new draft quotation', async () => {
      const res = await request(app)
        .post('/api/quotations')
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          customerId: customer.id,
          notes: 'Standard deployment test',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quoteNumber).toMatch(/^Q-\d+/);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.version).toBe(1);

      createdQuoteId = res.body.data.id;
      currentQuoteVersion = res.body.data.version;
    });

    test('PATCH /api/quotations/:id/lines adds a line item with authoritative pricing and margin', async () => {
      const res = await request(app)
        .patch(`/api/quotations/${createdQuoteId}/lines`)
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          productId: testHardwareProduct.id,
          quantity: 2,
          discountPercent: 0,
          version: currentQuoteVersion,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const quote = res.body.data;
      expect(quote.lines.length).toBe(1);
      expect(quote.version).toBe(currentQuoteVersion + 1);
      currentQuoteVersion = quote.version;

      const line = quote.lines[0];
      createdLineId = line.id;

      // 2 * 1000 = 2000 subtotal, 0 discount, 10% tax = 200, grand total = 2200
      expect(Number(line.unitPrice)).toBe(1000.0);
      expect(Number(line.lineSubtotal)).toBe(2000.0);
      expect(Number(line.lineDiscountAmount)).toBe(0);
      expect(Number(line.lineMargin)).toBe(800.0); // (2000 - 2*600 = 800)

      expect(Number(quote.subtotal)).toBe(2000.0);
      expect(Number(quote.grandTotal)).toBe(2200.0);
      expect(Number(quote.marginAmount)).toBe(800.0);
      expect(Number(quote.marginPercentage)).toBe(40.0);
      expect(quote.blendedRiskScore).toBe(0);
      expect(quote.riskLevel).toBe('NONE');
    });

    test('PATCH /api/quotations/:id/lines rejects stale version with 409 Conflict', async () => {
      const staleVersion = currentQuoteVersion - 1; // Outdated

      const res = await request(app)
        .patch(`/api/quotations/${createdQuoteId}/lines`)
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          lineId: createdLineId,
          quantity: 3,
          version: staleVersion,
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code || res.body.errorCode).toBe('STALE_VERSION_ERROR');
    });

    test('PATCH /api/quotations/:id/lines adjusts discount beyond tier ceiling, triggering risk', async () => {
      // Bronze ceiling is 5.5%, Hardware guard is 15%.
      // Set discount to 20% (exceeds both bronze and hardware limits)
      const res = await request(app)
        .patch(`/api/quotations/${createdQuoteId}/lines`)
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          lineId: createdLineId,
          productId: testHardwareProduct.id,
          quantity: 2,
          discountPercent: 20,
          version: currentQuoteVersion,
        });

      expect(res.status).toBe(200);
      const quote = res.body.data;
      currentQuoteVersion = quote.version;

      // Authoritative check:
      // Subtotal: 2000, 20% discount = 400. Net = 1600. Tax (10%) = 160. GrandTotal = 1760.
      expect(Number(quote.subtotal)).toBe(2000.0);
      expect(Number(quote.discountTotal)).toBe(400.0);
      expect(Number(quote.grandTotal)).toBe(1760.0);

      // Margin: Net 1600 - Cost 1200 = 400 margin (25%).
      expect(Number(quote.marginAmount)).toBe(400.0);
      expect(Number(quote.marginPercentage)).toBe(25.0);

      // Blended risk should have escalated due to 20% exceeding Bronze 5.5% and Hardware 15%
      expect(quote.blendedRiskScore).toBeGreaterThan(0);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(quote.riskLevel);
    });

    test('GET /api/quotations lists quotations with proper metadata', async () => {
      const res = await request(app)
        .get('/api/quotations?limit=10')
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.quotations)).toBe(true);
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
    });

    test('GET /api/quotations/dashboard-metrics returns KPI counts', async () => {
      const res = await request(app)
        .get('/api/quotations/dashboard-metrics')
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics).toHaveProperty('pendingApprovals');
      expect(res.body.data.metrics).toHaveProperty('openQuotations');
      expect(res.body.data.metrics).toHaveProperty('atRiskDeals');
    });

    test('POST /api/quotations/:id/submit-approval triggers sequential approval workflow', async () => {
      const res = await request(app)
        .post(`/api/quotations/${createdQuoteId}/submit-approval`)
        .set('Authorization', `Bearer ${repToken}`)
        .send({ version: currentQuoteVersion });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const quote = res.body.data;
      expect(quote.status).toBe('PENDING_APPROVAL');
    });
  });
});
