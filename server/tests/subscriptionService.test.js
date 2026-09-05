const request = require('supertest');
const app = require('../app');
const prisma = require('../prisma/prisma');
const authService = require('../services/authService');
const {
  calculateProration,
  calculateCancellationCredit,
  validatePlanChange,
} = require('../services/subscriptionService');

describe('Subscription Service & Billing Mechanics', () => {
  let adminToken;
  let repToken;
  let testPlan;

  beforeAll(async () => {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const { token: aTok } = await authService.login(admin.email, 'Password123!');
    adminToken = aTok;

    const rep = await prisma.user.findFirst({ where: { role: 'SALES_REP' } });
    const { token: rTok } = await authService.login(rep.email, 'Password123!');
    repToken = rTok;
  });

  afterAll(async () => {
    if (testPlan?.id) {
      await prisma.subscriptionPlan.deleteMany({ where: { id: testPlan.id } });
    }
  });

  describe('Pure Function: calculateProration', () => {
    test('calculates correct positive prorated charge on seat addition (Monthly)', () => {
      // 10 seats -> 15 seats (+5 seats), Plan Price $300/mo (30 days => $10/day), 15 days remaining
      // Proration = 5 * (300 / 30) * 15 = 5 * 10 * 15 = $750.00
      const proration = calculateProration(10, 15, 300, 'MONTHLY', 15);
      expect(proration).toBe(750.0);
    });

    test('calculates correct negative prorated credit on seat reduction (Monthly)', () => {
      // 10 seats -> 8 seats (-2 seats), Plan Price $300/mo, 10 days remaining
      // Proration = -2 * (300 / 30) * 10 = -200.00
      const proration = calculateProration(10, 8, 300, 'MONTHLY', 10);
      expect(proration).toBe(-200.0);
    });

    test('handles Quarterly cycle (90 days) correctly', () => {
      // +1 seat, Plan $900/quarter, 45 days remaining
      // daily rate = 900 / 90 = 10, 1 * 10 * 45 = 450.00
      const proration = calculateProration(1, 2, 900, 'QUARTERLY', 45);
      expect(proration).toBe(450.0);
    });

    test('returns 0 when 0 days remaining in cycle', () => {
      const proration = calculateProration(5, 10, 100, 'MONTHLY', 0);
      expect(proration).toBe(0);
    });

    test('throws error on invalid numeric input', () => {
      expect(() => calculateProration('invalid', 10, 100, 'MONTHLY', 15)).toThrow();
      expect(() => calculateProration(10, 20, -50, 'MONTHLY', 15)).toThrow();
    });
  });

  describe('Pure Function: calculateCancellationCredit', () => {
    test('calculates full unused credit with zero cancellation fee', () => {
      // $300 plan, 15 days remaining out of 30, fee 0%
      // unused = 300 * (15/30) = 150.00
      const credit = calculateCancellationCredit(300, 15, 'MONTHLY', 0);
      expect(credit).toBe(150.0);
    });

    test('applies cancellation fee percentage deducted from unused portion', () => {
      // $300 plan, 15 days remaining (unused $150), 10% cancellation fee ($15)
      // net credit = 150 - 15 = 135.00
      const credit = calculateCancellationCredit(300, 15, 'MONTHLY', 10);
      expect(credit).toBe(135.0);
    });

    test('returns 0 if 0 days remain', () => {
      const credit = calculateCancellationCredit(500, 0, 'MONTHLY', 10);
      expect(credit).toBe(0);
    });

    test('throws error on invalid price', () => {
      expect(() => calculateCancellationCredit(-100, 15, 'MONTHLY')).toThrow();
    });
  });

  describe('Pure Function: validatePlanChange', () => {
    test('accepts valid upgrade between active plans', () => {
      const current = { id: 'p1', name: 'Starter', price: 50, isActive: true };
      const next = { id: 'p2', name: 'Pro', price: 150, isActive: true };
      const res = validatePlanChange(current, next);
      expect(res.valid).toBe(true);
    });

    test('rejects transition to an inactive plan', () => {
      const current = { id: 'p1', name: 'Starter', price: 50, isActive: true };
      const next = { id: 'p2', name: 'Deprecated Plan', price: 100, isActive: false };
      const res = validatePlanChange(current, next);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/inactive/i);
    });

    test('rejects transition when target is same as current plan', () => {
      const current = { id: 'p1', name: 'Starter', price: 50, isActive: true };
      const res = validatePlanChange(current, current);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/identical/i);
    });
  });

  describe('Admin Subscription Plan CRUD Endpoints', () => {
    test('POST /api/admin/subscription-plans allows admin to create plan', async () => {
      const res = await request(app)
        .post('/api/admin/subscription-plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Test Enterprise SaaS ${Date.now()}`,
          code: `TEST-SAAS-${Date.now()}`,
          tier: 'ENTERPRISE',
          billingCycle: 'MONTHLY',
          price: 299.99,
          features: ['SSO', 'Audit Logs', 'Priority Support'],
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.price)).toBe(299.99);
      testPlan = res.body.data;
    });

    test('POST /api/admin/subscription-plans rejects non-admin with 403', async () => {
      const res = await request(app)
        .post('/api/admin/subscription-plans')
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          name: 'Unauthorized Plan',
          code: 'UNAUTH-1',
          tier: 'STARTER',
          billingCycle: 'MONTHLY',
          price: 49.0,
        });

      expect(res.status).toBe(403);
    });

    test('GET /api/admin/subscription-plans returns list of active plans', async () => {
      const res = await request(app)
        .get('/api/admin/subscription-plans')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((p) => p.id === testPlan.id)).toBe(true);
    });

    test('PATCH /api/admin/subscription-plans/:id updates plan details', async () => {
      const res = await request(app)
        .patch(`/api/admin/subscription-plans/${testPlan.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 349.99,
        });

      expect(res.status).toBe(200);
      expect(Number(res.body.data.price)).toBe(349.99);
    });

    test('DELETE /api/admin/subscription-plans/:id deletes plan', async () => {
      const res = await request(app)
        .delete(`/api/admin/subscription-plans/${testPlan.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
    });
  });
});
