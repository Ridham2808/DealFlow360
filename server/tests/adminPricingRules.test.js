const request = require('supertest');
const app = require('../app');
const { generateToken } = require('../utils/tokenHelper');
const priceListRepository = require('../repositories/priceListRepository');
const discountRepository = require('../repositories/discountRepository');
const approvalRuleRepository = require('../repositories/approvalRuleRepository');
const userRepository = require('../repositories/userRepository');

jest.mock('../repositories/priceListRepository');
jest.mock('../repositories/discountRepository');
jest.mock('../repositories/approvalRuleRepository');
jest.mock('../repositories/userRepository');
jest.mock('../services/auditService');

describe('Admin Pricing, Discounts & Approval Rules Test Suite', () => {
  const adminToken = generateToken({
    userId: 'admin-uuid-001',
    email: 'admin@dealflow360.com',
    role: 'ADMIN',
  });

  const repToken = generateToken({
    userId: 'rep-uuid-001',
    email: 'rep@dealflow360.com',
    role: 'SALES_REP',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository.findById.mockImplementation(async (id) => {
      if (id === 'admin-uuid-001') {
        return { id, name: 'Admin', email: 'admin@dealflow360.com', role: 'ADMIN', isActive: true };
      }
      if (id === 'rep-uuid-001') {
        return { id, name: 'Rep', email: 'rep@dealflow360.com', role: 'SALES_REP', isActive: true };
      }
      return null;
    });
  });

  describe('1. Price Lists Management', () => {
    it('should create price list for customer tier with ADMIN token', async () => {
      priceListRepository.create.mockResolvedValue({
        id: 'pl-gold-001',
        name: 'Enterprise Gold Tier',
        customerTier: 'GOLD',
        currency: 'USD',
        isActive: true,
        items: [],
      });

      const res = await request(app)
        .post('/api/admin/pricelists')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Enterprise Gold Tier',
          customerTier: 'GOLD',
          currency: 'USD',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customerTier).toBe('GOLD');
    });

    it('should reject invalid customer tier with 400', async () => {
      const res = await request(app)
        .post('/api/admin/pricelists')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Tier List',
          customerTier: 'DIAMOND',
          currency: 'USD',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. Discount Tiers & Category Ceilings', () => {
    it('should update discount tier percentage', async () => {
      discountRepository.findTierById.mockResolvedValue({
        id: 'dt-gold-001',
        customerTier: 'GOLD',
        maxDiscountPercent: 15,
      });
      discountRepository.updateTier.mockResolvedValue({
        id: 'dt-gold-001',
        customerTier: 'GOLD',
        maxDiscountPercent: 18,
      });

      const res = await request(app)
        .patch('/api/admin/discount-tiers/dt-gold-001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ maxDiscountPercent: 18 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.maxDiscountPercent).toBe(18);
    });

    it('should reject discount percentage over 100 with 400', async () => {
      const res = await request(app)
        .patch('/api/admin/discount-tiers/dt-gold-001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ maxDiscountPercent: 150 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should update category discount ceiling', async () => {
      discountRepository.findCeilingById.mockResolvedValue({
        id: 'cdc-hw-001',
        category: 'Hardware',
        maxDiscountPercent: 15,
      });
      discountRepository.updateCeiling.mockResolvedValue({
        id: 'cdc-hw-001',
        category: 'Hardware',
        maxDiscountPercent: 12,
      });

      const res = await request(app)
        .patch('/api/admin/category-ceilings/cdc-hw-001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ maxDiscountPercent: 12 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.maxDiscountPercent).toBe(12);
    });
  });

  describe('3. Approval Chain Rules', () => {
    it('should update approval chain rule overage ranges', async () => {
      approvalRuleRepository.findById.mockResolvedValue({
        id: 'rule-mgr-001',
        requiredRole: 'SALES_MANAGER',
        minimumOverage: 0.01,
        maximumOverage: 10,
        orderIndex: 1,
      });
      approvalRuleRepository.update.mockResolvedValue({
        id: 'rule-mgr-001',
        requiredRole: 'SALES_MANAGER',
        minimumOverage: 0.01,
        maximumOverage: 12,
        orderIndex: 1,
      });

      const res = await request(app)
        .patch('/api/admin/approval-chain-rules/rule-mgr-001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ maximumOverage: 12 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.maximumOverage).toBe(12);
    });

    it('should reject when maximum overage is less than minimum overage', async () => {
      approvalRuleRepository.findById.mockResolvedValue({
        id: 'rule-mgr-001',
        requiredRole: 'SALES_MANAGER',
        minimumOverage: 5,
        maximumOverage: 10,
        orderIndex: 1,
      });

      const res = await request(app)
        .patch('/api/admin/approval-chain-rules/rule-mgr-001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ maximumOverage: 2 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
