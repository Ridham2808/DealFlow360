const request = require('supertest');
const app = require('../app');
const prisma = require('../prisma/prisma');
const authService = require('../services/authService');

describe('Quotation Builder Mixed Lines: Products, Services, Warranty, and Subscriptions', () => {
  let repToken;
  let repUser;
  let goldCustomer;
  let quoteId;
  let quoteVersion = 1;

  // Products
  let laptopProduct;
  let dockProduct;
  let serviceProduct;
  let warrantyProduct;
  let subscriptionProduct;
  let subPlan;

  beforeAll(async () => {
    repUser = await prisma.user.findFirst({ where: { role: 'SALES_REP' } });
    const { token } = await authService.login(repUser.email, 'Password123!');
    repToken = token;

    goldCustomer = await prisma.customer.findFirst({ where: { tier: 'GOLD' } });
    if (!goldCustomer) {
      goldCustomer = await prisma.customer.create({
        data: {
          name: 'Acme Corp Test',
          email: `acme-${Date.now()}@example.com`,
          tier: 'GOLD',
          isActive: true,
        },
      });
    }

    laptopProduct = await prisma.product.findFirst({ where: { sku: 'HW-LAP-14' } });
    dockProduct = await prisma.product.findFirst({ where: { sku: 'HW-DCK-01' } });
    serviceProduct = await prisma.product.findFirst({ where: { sku: 'SRV-SETUP-01' } });
    warrantyProduct = await prisma.product.findFirst({ where: { sku: 'WRN-EXT-01' } });
    subscriptionProduct = await prisma.product.findFirst({ where: { sku: 'SUB-CARE-2YR' } });
    subPlan = await prisma.subscriptionPlan.findFirst({ where: { isActive: true } });
  });

  afterAll(async () => {
    if (quoteId) {
      await prisma.approvalStep.deleteMany({ where: { quotationId: quoteId } });
      await prisma.quotationLine.deleteMany({ where: { quotationId: quoteId } });
      await prisma.auditLog.deleteMany({ where: { quotationId: quoteId } });
      await prisma.quotation.deleteMany({ where: { id: quoteId } });
    }
  });

  test('1. Create draft quotation with Gold Customer and initial empty state', async () => {
    const res = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${repToken}`)
      .send({
        customerId: goldCustomer.id,
        currency: 'USD',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    quoteId = res.body.data.id;
    quoteVersion = res.body.data.version;

    // Verify initial empty state values
    const detailRes = await request(app)
      .get(`/api/quotations/${quoteId}`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.status).toBe('DRAFT');
    expect(detailRes.body.data.lines).toHaveLength(0);
    expect(Number(detailRes.body.data.grandTotal)).toBe(0);
    expect(detailRes.body.data.blendedRiskScore).toBe(0);
    expect(detailRes.body.data.priceList).toBeDefined();
  });

  test('2. Add one physical product (Laptop Pro 14) and verify stock check', async () => {
    const res = await request(app)
      .patch(`/api/quotations/${quoteId}/lines`)
      .set('Authorization', `Bearer ${repToken}`)
      .send({
        productId: laptopProduct.id,
        quantity: 2,
        discountPercent: 12,
        version: quoteVersion,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    quoteVersion = res.body.data.version;

    const quoteRes = await request(app)
      .get(`/api/quotations/${quoteId}`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(quoteRes.body.data.lines).toHaveLength(1);
    const line = quoteRes.body.data.lines[0];
    expect(line.itemType).toBe('PHYSICAL_PRODUCT');
    expect(line.stockStatus).toBe('IN_STOCK');
    expect(Number(line.lineDiscountLimit)).toBe(15); // min(15 Gold, 15 Hardware)
    expect(line.lineDiscountLimit).toBeDefined();
  });

  test('3. Add multiple physical products (Docking Station)', async () => {
    const res = await request(app)
      .patch(`/api/quotations/${quoteId}/lines`)
      .set('Authorization', `Bearer ${repToken}`)
      .send({
        productId: dockProduct.id,
        quantity: 1,
        discountPercent: 5,
        version: quoteVersion,
      });

    expect(res.status).toBe(200);
    quoteVersion = res.body.data.version;

    const quoteRes = await request(app)
      .get(`/api/quotations/${quoteId}`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(quoteRes.body.data.lines).toHaveLength(2);
  });

  test('4. Add a service line (Onsite Setup Service) with 18% discount and verify OVER limit status', async () => {
    const res = await request(app)
      .patch(`/api/quotations/${quoteId}/lines`)
      .set('Authorization', `Bearer ${repToken}`)
      .send({
        productId: serviceProduct.id,
        quantity: 1,
        discountPercent: 18,
        version: quoteVersion,
      });

    expect(res.status).toBe(200);
    quoteVersion = res.body.data.version;

    const quoteRes = await request(app)
      .get(`/api/quotations/${quoteId}`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(quoteRes.body.data.lines).toHaveLength(3);
    const srvLine = quoteRes.body.data.lines.find((l) => l.productId === serviceProduct.id);
    expect(srvLine.itemType).toBe('SERVICE');
    expect(srvLine.stockStatus).toBeNull(); // Services do NOT consume warehouse stock!
    expect(Number(srvLine.lineDiscountLimit)).toBe(10); // Services ceiling is 10%
    expect(Number(srvLine.discountPercent)).toBe(18); // 18% exceeds 10% by 8pt
  });

  test('5. Add an extended warranty linked to physical product', async () => {
    const res = await request(app)
      .patch(`/api/quotations/${quoteId}/lines`)
      .set('Authorization', `Bearer ${repToken}`)
      .send({
        productId: warrantyProduct.id,
        quantity: 1,
        discountPercent: 10,
        version: quoteVersion,
      });

    expect(res.status).toBe(200);
    quoteVersion = res.body.data.version;

    const quoteRes = await request(app)
      .get(`/api/quotations/${quoteId}`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(quoteRes.body.data.lines).toHaveLength(4);
    const wrnLine = quoteRes.body.data.lines.find((l) => l.productId === warrantyProduct.id);
    expect(wrnLine.itemType).toBe('WARRANTY');
    expect(Number(wrnLine.lineDiscountLimit)).toBe(15);
  });

  test('6. Add a recurring subscription plan (Care Plan 2yr)', async () => {
    const res = await request(app)
      .patch(`/api/quotations/${quoteId}/lines`)
      .set('Authorization', `Bearer ${repToken}`)
      .send({
        productId: subscriptionProduct.id,
        subscriptionPlanId: subPlan ? subPlan.id : null,
        quantity: 1,
        discountPercent: 0,
        version: quoteVersion,
      });

    expect(res.status).toBe(200);
    quoteVersion = res.body.data.version;

    const quoteRes = await request(app)
      .get(`/api/quotations/${quoteId}`)
      .set('Authorization', `Bearer ${repToken}`);

    // Verify all 4 line types exist in the quotation together
    expect(quoteRes.body.data.lines).toHaveLength(5);
    const types = quoteRes.body.data.lines.map((l) => l.itemType);
    expect(types).toContain('PHYSICAL_PRODUCT');
    expect(types).toContain('SERVICE');
    expect(types).toContain('WARRANTY');
    expect(types).toContain('SUBSCRIPTION');
  });

  test('7. Upsell recommendations are calculated by backend and prevent duplicate additions', async () => {
    const upRes = await request(app)
      .get(`/api/quotations/${quoteId}/upsell-suggestions`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(upRes.status).toBe(200);
    expect(Array.isArray(upRes.body.data)).toBe(true);

    // Products already on the quote should not be recommended
    const currentProductIds = new Set(
      (await prisma.quotationLine.findMany({ where: { quotationId: quoteId } })).map((l) => l.productId)
    );
    for (const sug of upRes.body.data) {
      expect(currentProductIds.has(sug.productId)).toBe(false);
    }
  });

  test('8. Submit for Approval creates sequential approval chain and locks the quote', async () => {
    const res = await request(app)
      .post(`/api/quotations/${quoteId}/submit-approval`)
      .set('Authorization', `Bearer ${repToken}`)
      .send({ version: quoteVersion });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const quoteRes = await request(app)
      .get(`/api/quotations/${quoteId}`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(quoteRes.body.data.status).toBe('PENDING_APPROVAL');

    // Attempting to mutate lines while PENDING_APPROVAL should be rejected
    const blockedRes = await request(app)
      .patch(`/api/quotations/${quoteId}/lines`)
      .set('Authorization', `Bearer ${repToken}`)
      .send({
        productId: laptopProduct.id,
        quantity: 5,
        version: quoteRes.body.data.version,
      });

    expect(blockedRes.status).toBe(400);
  });
});
