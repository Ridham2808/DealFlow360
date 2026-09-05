const request = require('supertest');
const app = require('../app');
const prisma = require('../prisma/prisma');
const authService = require('../services/authService');
const upsellService = require('../services/upsellService');

describe('Upsell & Cross-Sell Service', () => {
  let adminToken;
  let repToken;
  let baseProduct;
  let addonProduct;
  let lowMarginProduct;
  let testRule;
  let testCustomer;
  let testQuotation;

  beforeAll(async () => {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const { token: aTok } = await authService.login(admin.email, 'Password123!');
    adminToken = aTok;

    const rep = await prisma.user.findFirst({ where: { role: 'SALES_REP' } });
    const { token: rTok } = await authService.login(rep.email, 'Password123!');
    repToken = rTok;

    testCustomer = await prisma.customer.findFirst();

    // Create Base Product
    baseProduct = await prisma.product.create({
      data: {
        name: `Server Node Alpha ${Date.now()}`,
        sku: `SRV-ALP-${Date.now()}`,
        category: 'HARDWARE',
        basePrice: 2000.0,
        baseCost: 1400.0, // 30% margin
        isActive: true,
      },
    });

    // Create Addon Product (High margin)
    addonProduct = await prisma.product.create({
      data: {
        name: `Pro Extended Warranty ${Date.now()}`,
        sku: `WRN-PRO-${Date.now()}`,
        category: 'SERVICES',
        basePrice: 500.0,
        baseCost: 100.0, // 80% margin
        isActive: true,
      },
    });

    // Create Low Margin Product
    lowMarginProduct = await prisma.product.create({
      data: {
        name: `Budget Cable Pack ${Date.now()}`,
        sku: `CBL-LOW-${Date.now()}`,
        category: 'HARDWARE',
        basePrice: 50.0,
        baseCost: 48.0, // 4% margin
        isActive: true,
      },
    });

    // Create a draft quotation with baseProduct
    testQuotation = await prisma.quotation.create({
      data: {
        quoteNumber: `Q-TEST-UPSELL-${Date.now()}`,
        customerId: testCustomer.id,
        ownerRepId: rep.id,
        status: 'DRAFT',
        subtotal: 2000.0,
        grandTotal: 2000.0,
        totalCost: 1400.0,
        marginAmount: 600.0,
        marginPercentage: 30.0,
        lines: {
          create: {
            productId: baseProduct.id,
            quantity: 1,
            unitPrice: 2000.0,
            unitCost: 1400.0,
            lineSubtotal: 2000.0,
            lineMargin: 600.0,
            categorySnapshot: 'HARDWARE',
            productNameSnapshot: baseProduct.name,
          },
        },
      },
    });
  });

  afterAll(async () => {
    if (testRule?.id) {
      await prisma.upsellRule.deleteMany({ where: { id: testRule.id } });
    }
    if (testQuotation?.id) {
      await prisma.quotationLine.deleteMany({ where: { quotationId: testQuotation.id } });
      await prisma.quotation.deleteMany({ where: { id: testQuotation.id } });
    }
    await prisma.product.deleteMany({
      where: { id: { in: [baseProduct?.id, addonProduct?.id, lowMarginProduct?.id].filter(Boolean) } },
    });
  });

  describe('Admin Upsell Rule Management', () => {
    test('POST /api/admin/upsell-rules creates a new rule', async () => {
      const res = await request(app)
        .post('/api/admin/upsell-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          triggerProductId: baseProduct.id,
          suggestedProductId: addonProduct.id,
          minimumMarginThreshold: 20.0,
          isPromoted: true,
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.triggerProductId).toBe(baseProduct.id);
      expect(res.body.data.suggestedProductId).toBe(addonProduct.id);
      testRule = res.body.data;
    });

    test('POST /api/admin/upsell-rules rejects non-admin with 403', async () => {
      const res = await request(app)
        .post('/api/admin/upsell-rules')
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          triggerProductId: baseProduct.id,
          suggestedProductId: addonProduct.id,
          minimumMarginThreshold: 10.0,
        });

      expect(res.status).toBe(403);
    });

    test('GET /api/admin/upsell-rules lists all rules', async () => {
      const res = await request(app)
        .get('/api/admin/upsell-rules')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((r) => r.id === testRule.id)).toBe(true);
    });
  });

  describe('Quotation Upsell Engine Integration', () => {
    test('GET /api/quotations/:id/upsell-suggestions returns ranked suggestions for quotation', async () => {
      const res = await request(app)
        .get(`/api/quotations/${testQuotation.id}/upsell-suggestions`)
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const match = res.body.data.find((s) => s.productId === addonProduct.id);
      expect(match).toBeDefined();
      expect(match.reason).toBeDefined();
      expect(match.marginPercent).toBeGreaterThan(50);
      expect(match.rankingScore).toBeGreaterThan(0);
    });

    test('Filters out suggestions that violate minMarginThreshold', async () => {
      // Create a rule with low margin product and high threshold
      const restrictiveRule = await prisma.upsellRule.create({
        data: {
          triggerProductId: baseProduct.id,
          suggestedProductId: lowMarginProduct.id,
          minimumMarginThreshold: 15.0, // LowMarginProduct is ~4%, so should be filtered out
          isActive: true,
        },
      });

      const suggestions = await upsellService.getUpsellSuggestions(testQuotation.id);
      expect(suggestions.some((s) => s.productId === lowMarginProduct.id)).toBe(false);

      await prisma.upsellRule.delete({ where: { id: restrictiveRule.id } });
    });
  });
});
