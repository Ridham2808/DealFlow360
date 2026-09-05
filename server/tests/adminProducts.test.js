const request = require('supertest');
const app = require('../app');
const { generateToken } = require('../utils/tokenHelper');
const productRepository = require('../repositories/productRepository');
const userRepository = require('../repositories/userRepository');

jest.mock('../repositories/productRepository');
jest.mock('../repositories/userRepository');
jest.mock('../services/auditService');

describe('Admin Products & Variants Test Suite', () => {
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

  const managerToken = generateToken({
    userId: 'mgr-uuid-001',
    email: 'manager@dealflow360.com',
    role: 'SALES_MANAGER',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository.findById.mockImplementation(async (id) => {
      if (id === 'admin-uuid-001') {
        return { id, name: 'Admin', email: 'admin@dealflow360.com', role: 'ADMIN', isActive: true };
      }
      if (id === 'mgr-uuid-001') {
        return { id, name: 'Manager', email: 'manager@dealflow360.com', role: 'SALES_MANAGER', isActive: true };
      }
      if (id === 'rep-uuid-001') {
        return { id, name: 'Rep', email: 'rep@dealflow360.com', role: 'SALES_REP', isActive: true };
      }
      return null;
    });
  });

  describe('1. Role-Based Access Control', () => {
    it('should allow SALES_MANAGER to list products', async () => {
      productRepository.findAll.mockResolvedValue({
        items: [{ id: 'p1', name: 'Laptop', sku: 'HW-LAP-01' }],
        pagination: { total: 1, page: 1, limit: 50, pages: 1 },
      });

      const res = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
    });

    it('should reject SALES_REP from listing admin products with 403', async () => {
      const res = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject SALES_MANAGER from creating products with 403', async () => {
      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Unauthorized Product',
          sku: 'HW-UNAUTH-01',
          category: 'Hardware',
          basePrice: 100,
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Product Creation & Validation', () => {
    it('should validate and create product with ADMIN token', async () => {
      productRepository.findBySku.mockResolvedValue(null);
      productRepository.create.mockResolvedValue({
        id: 'prod-new-001',
        name: 'Monitors Pro 27',
        sku: 'HW-MON-27',
        category: 'Hardware',
        basePrice: 450,
        baseCost: 300,
        unit: 'UNIT',
        isActive: true,
      });

      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Monitors Pro 27',
          sku: 'HW-MON-27',
          category: 'Hardware',
          basePrice: 450,
          baseCost: 300,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sku).toBe('HW-MON-27');
    });

    it('should reject duplicate SKU with 409', async () => {
      productRepository.findBySku.mockResolvedValue({ id: 'existing-id', sku: 'HW-LAP-14' });

      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Laptop',
          sku: 'HW-LAP-14',
          category: 'Hardware',
          basePrice: 2000,
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.error.code).toBe('SKU_ALREADY_EXISTS');
    });

    it('should reject invalid basePrice with 400', async () => {
      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Price Product',
          sku: 'HW-TEST-01',
          category: 'Hardware',
          basePrice: -50,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. Variant Operations', () => {
    it('should create product variant under valid product', async () => {
      productRepository.findById.mockResolvedValue({ id: 'prod-001', sku: 'HW-LAP-14' });
      productRepository.findVariants.mockResolvedValue([]);
      productRepository.createVariant.mockResolvedValue({
        id: 'var-001',
        productId: 'prod-001',
        attributeName: 'RAM',
        attributeValue: '32GB',
        extraPrice: 200,
        skuSuffix: '32GB',
      });

      const res = await request(app)
        .post('/api/admin/products/prod-001/variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          attributeName: 'RAM',
          attributeValue: '32GB',
          extraPrice: 200,
          skuSuffix: '32GB',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.skuSuffix).toBe('32GB');
    });
  });
});
