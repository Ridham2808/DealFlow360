const request = require('supertest');
const app = require('../app');
const { generateToken } = require('../utils/tokenHelper');
const warehouseRepository = require('../repositories/warehouseRepository');
const productRepository = require('../repositories/productRepository');
const userRepository = require('../repositories/userRepository');

jest.mock('../repositories/warehouseRepository');
jest.mock('../repositories/productRepository');
jest.mock('../repositories/userRepository');
jest.mock('../services/auditService');

describe('Admin Warehouses & Stock Levels Test Suite', () => {
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

  describe('1. Warehouse Facility Management', () => {
    it('should create a warehouse with ADMIN token', async () => {
      warehouseRepository.findByName.mockResolvedValue(null);
      warehouseRepository.create.mockResolvedValue({
        id: 'wh-west-001',
        name: 'West Coast Hub',
        location: 'Reno, NV',
        shippingCostWeight: 1.15,
        isActive: true,
      });

      const res = await request(app)
        .post('/api/admin/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'West Coast Hub',
          location: 'Reno, NV',
          shippingCostWeight: 1.15,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('West Coast Hub');
    });

    it('should reject warehouse creation for non-admin SALES_REP with 403', async () => {
      const res = await request(app)
        .post('/api/admin/warehouses')
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          name: 'Unauthorized Warehouse',
          location: 'Nowhere',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Inventory Stock Levels & Protection', () => {
    it('should update stock levels for valid product and warehouse', async () => {
      warehouseRepository.findById.mockResolvedValue({ id: 'wh-001', name: 'Main' });
      productRepository.findById.mockResolvedValue({ id: 'prod-001', sku: 'HW-LAP-14' });
      warehouseRepository.findStock.mockResolvedValue({
        id: 'stock-001',
        warehouseId: 'wh-001',
        productId: 'prod-001',
        quantityOnHand: 20,
        reserved: 5,
        replenishmentThreshold: 10,
      });
      warehouseRepository.upsertStock.mockResolvedValue({
        id: 'stock-001',
        warehouseId: 'wh-001',
        productId: 'prod-001',
        quantityOnHand: 50,
        reserved: 5,
        replenishmentThreshold: 10,
      });

      const res = await request(app)
        .patch('/api/admin/warehouses/wh-001/stock/prod-001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantityOnHand: 50 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.available).toBe(45);
      expect(res.body.data.isLowStock).toBe(false);
    });

    it('should reject stock adjustment if reserved quantity exceeds on-hand', async () => {
      warehouseRepository.findById.mockResolvedValue({ id: 'wh-001', name: 'Main' });
      productRepository.findById.mockResolvedValue({ id: 'prod-001', sku: 'HW-LAP-14' });
      warehouseRepository.findStock.mockResolvedValue({
        id: 'stock-001',
        warehouseId: 'wh-001',
        productId: 'prod-001',
        quantityOnHand: 10,
        reserved: 5,
        replenishmentThreshold: 10,
      });

      const res = await request(app)
        .patch('/api/admin/warehouses/wh-001/stock/prod-001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantityOnHand: 4 }); // Less than existing reserved (5)

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STOCK_ALLOCATION');
    });
  });
});
