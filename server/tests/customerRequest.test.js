const request = require('supertest');
const app = require('../app');
const prisma = require('../prisma/prisma');
const authService = require('../services/authService');

describe('Customer Inbound Demand & RFQ Request Workflow', () => {
  let customerToken;
  let customerUser;
  let repToken;
  let repUser;
  let testCustomerId;
  let createdRequestId;
  let createdQuotationId;

  beforeAll(async () => {
    // 1. Customer User
    customerUser = await prisma.user.findFirst({
      where: { role: 'CUSTOMER', email: 'customer@acmecorp.com' },
      include: { customer: true },
    });
    const custLogin = await authService.login(customerUser.email, 'Password123!');
    customerToken = custLogin.token;
    testCustomerId = customerUser.customerId;

    // 2. Sales Rep User
    repUser = await prisma.user.findFirst({ where: { role: 'SALES_REP' } });
    const repLogin = await authService.login(repUser.email, 'Password123!');
    repToken = repLogin.token;
  });

  afterAll(async () => {
    if (createdQuotationId) {
      await prisma.quotationLine.deleteMany({ where: { quotationId: createdQuotationId } });
      await prisma.auditLog.deleteMany({ where: { quotationId: createdQuotationId } });
      await prisma.customerRequest.deleteMany({ where: { quotationId: createdQuotationId } });
      await prisma.quotation.deleteMany({ where: { id: createdQuotationId } });
    }
    if (createdRequestId) {
      await prisma.customerRequest.deleteMany({ where: { id: createdRequestId } });
    }
  });

  test('1. Customer can load safe public catalog for product suggestions', async () => {
    const res = await request(app)
      .get('/api/portal/catalog')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.products)).toBe(true);
    expect(res.body.data.products.length).toBeGreaterThan(0);
    // Safe fields only - no cost or margin
    const first = res.body.data.products[0];
    expect(first.baseCost).toBeUndefined();
  });

  test('2. Customer can view their submitted quote requests', async () => {
    const res = await request(app)
      .get('/api/portal/requests')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.requests)).toBe(true);
  });

  test('3. Customer submits a new quote request (RFQ)', async () => {
    const payload = {
      title: 'Engineering Cluster Hardware & Extended Care',
      targetBudget: 42000,
      neededByDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Please quote 10 units of Laptop Pro 14 with 3-Year Extended Warranty and Onboarding.',
      items: [
        { name: 'Laptop Pro 14', quantity: 10, category: 'Hardware', notes: '32GB RAM' },
        { name: 'Extended Care Warranty', quantity: 10, category: 'Warranty', notes: '3-Year coverage' },
        { name: 'Enterprise Deployment & Onboarding', quantity: 1, category: 'Services', notes: 'Remote deployment' },
      ],
    };

    const res = await request(app)
      .post('/api/portal/requests')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request).toBeDefined();
    expect(res.body.data.request.status).toBe('PENDING');
    expect(res.body.data.request.requestNumber).toMatch(/^REQ-\d+/);
    expect(res.body.data.request.items).toHaveLength(3);

    createdRequestId = res.body.data.request.id;
  });

  test('4. Sales Rep can fetch inbound customer requests with pending count', async () => {
    const res = await request(app)
      .get('/api/customer-requests')
      .set('Authorization', `Bearer ${repToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.requests)).toBe(true);
    expect(res.body.data.pendingCount).toBeGreaterThanOrEqual(1);

    const found = res.body.data.requests.find((r) => r.id === createdRequestId);
    expect(found).toBeDefined();
    expect(found.customer.name).toBe('Acme Corp');
  });

  test('5. Sales Rep converts customer request into Quotation draft with pre-filled lines', async () => {
    const res = await request(app)
      .post(`/api/customer-requests/${createdRequestId}/create-quotation`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quotationId).toBeDefined();
    expect(res.body.data.quoteNumber).toMatch(/^Q-\d+/);

    createdQuotationId = res.body.data.quotationId;

    // Verify quotation was created with lines
    const quoteRes = await request(app)
      .get(`/api/quotations/${createdQuotationId}`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(quoteRes.status).toBe(200);
    expect(quoteRes.body.data.customerId).toBe(testCustomerId);
    expect(quoteRes.body.data.status).toBe('DRAFT');
    expect(quoteRes.body.data.lines.length).toBeGreaterThanOrEqual(1);

    // Verify customer request status is now QUOTED
    const reqRes = await request(app)
      .get(`/api/customer-requests/${createdRequestId}`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(reqRes.status).toBe(200);
    expect(reqRes.body.data.request.status).toBe('QUOTED');
    expect(reqRes.body.data.request.quotationId).toBe(createdQuotationId);
  });

  test('6. Sales Rep can update request status', async () => {
    const res = await request(app)
      .patch(`/api/customer-requests/${createdRequestId}/status`)
      .set('Authorization', `Bearer ${repToken}`)
      .send({ status: 'REVIEWED' });

    expect(res.status).toBe(200);
    expect(res.body.data.request.status).toBe('REVIEWED');
  });
});
