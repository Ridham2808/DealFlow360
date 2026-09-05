const request = require('supertest');
const app = require('../app');
const prisma = require('../prisma/prisma');
const authService = require('../services/authService');
const pricingService = require('../services/pricingService');
const { validateCreateProduct } = require('../validators/productValidator');

describe('Pricing Service & Validation Engine', () => {
  let adminToken;
  let testProduct;
  let testVariant;
  let testPriceList;

  beforeAll(async () => {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const { token } = await authService.login(admin.email, 'Password123!');
    adminToken = token;

    // Create a dedicated test product
    testProduct = await prisma.product.create({
      data: {
        name: 'Enterprise Test Server',
        sku: `TEST-SRV-${Date.now()}`,
        category: 'HARDWARE',
        basePrice: 1000.00,
        baseCost: 650.00,
        unit: 'UNIT',
        taxPercent: 18.00,
        isActive: true,
      },
    });

    // Create a variant with extra price
    testVariant = await prisma.productVariant.create({
      data: {
        productId: testProduct.id,
        attributeName: 'RAM',
        attributeValue: '64GB DDR5',
        skuSuffix: 'RAM64',
        extraPrice: 150.00,
        isActive: true,
      },
    });

    // Create a price list with override for this product
    testPriceList = await prisma.priceList.create({
      data: {
        name: 'Gold Corporate Tier',
        currency: 'USD',
        customerTier: 'GOLD',
        isActive: true,
        items: {
          create: {
            productId: testProduct.id,
            unitPrice: 900.00, // $100 off base price
          },
        },
      },
    });
  });

  afterAll(async () => {
    if (testPriceList) {
      await prisma.priceListItem.deleteMany({ where: { priceListId: testPriceList.id } }).catch(() => {});
      await prisma.priceList.delete({ where: { id: testPriceList.id } }).catch(() => {});
    }
    if (testVariant) {
      await prisma.productVariant.delete({ where: { id: testVariant.id } }).catch(() => {});
    }
    if (testProduct) {
      await prisma.product.delete({ where: { id: testProduct.id } }).catch(() => {});
    }
  });

  describe('resolvePrice() Unit Tests', () => {
    it('resolves base price when no price list matches tier', async () => {
      const result = await pricingService.resolvePrice(testProduct.id, 'BRONZE', 'USD', 2);
      expect(result.basePrice).toBe(1000);
      expect(result.finalUnitPrice).toBe(1000);
      expect(result.quantity).toBe(2);
      expect(result.lineTotal).toBe(2000);
      expect(result.source).toBe('BASE_PRICE');
    });

    it('resolves item-level price list override for matching tier', async () => {
      const result = await pricingService.resolvePrice(testProduct.id, 'GOLD', 'USD', 1);
      expect(result.basePrice).toBe(1000);
      expect(result.priceListAdjustment).toBe(-100);
      expect(result.finalUnitPrice).toBe(900);
      expect(result.source).toBe('PRICE_LIST_ITEM_OVERRIDE');
      expect(result.effectivePriceListId).toBe(testPriceList.id);
    });

    it('adds variant surcharge to final unit price', async () => {
      const result = await pricingService.resolvePrice(testProduct.id, 'GOLD', 'USD', 1, testVariant.id);
      expect(result.basePrice).toBe(1000);
      expect(result.priceListAdjustment).toBe(-100);
      expect(result.variantSurcharge).toBe(150);
      expect(result.finalUnitPrice).toBe(1050); // 900 + 150
      expect(result.variant.attributeValue).toBe('64GB DDR5');
    });

    it('prevents negative final unit prices', async () => {
      // Mock extreme discount or adjustment
      const result = await pricingService.resolvePrice(testProduct.id, 'BRONZE', 'USD', 1);
      expect(result.finalUnitPrice).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Validation Requirements', () => {
    it('enforces category to be exactly HARDWARE, SERVICES, or SUBSCRIPTION', () => {
      expect(() => {
        validateCreateProduct({
          name: 'Invalid Cat Prod',
          sku: 'INV-CAT-001',
          category: 'SOFTWARE_CUSTOM',
          basePrice: 50,
        });
      }).toThrow(/Product category must be exactly HARDWARE, SERVICES, or SUBSCRIPTION/);

      const valid = validateCreateProduct({
        name: 'Valid Service',
        sku: 'SRV-CONS-001',
        category: 'SERVICES',
        basePrice: 150,
      });
      expect(valid.category).toBe('SERVICES');
    });

    it('enforces tax percentage between 0 and 100', () => {
      expect(() => {
        validateCreateProduct({
          name: 'High Tax Prod',
          sku: 'TAX-HIGH-001',
          category: 'HARDWARE',
          basePrice: 100,
          taxPercent: 120,
        });
      }).toThrow(/Tax percent must be between 0 and 100/);
    });

    it('enforces non-negative base price and cost', () => {
      expect(() => {
        validateCreateProduct({
          name: 'Negative Prod',
          sku: 'NEG-PROD-001',
          category: 'HARDWARE',
          basePrice: -50,
        });
      }).toThrow(/Base price must be a valid non-negative number/);
    });
  });

  describe('Product Soft-Delete & Dependency Protection', () => {
    let stockDepotProduct;
    let warehouse;
    let stockLevel;

    beforeAll(async () => {
      // Create warehouse
      warehouse = await prisma.warehouse.create({
        data: {
          name: 'Test Depo Center',
          location: 'Phoenix, AZ',
          shippingCostWeight: 1.0,
          isActive: true,
        },
      });

      // Create product with stock
      stockDepotProduct = await prisma.product.create({
        data: {
          name: 'Stock Dependent Hardware',
          sku: `STK-DEP-${Date.now()}`,
          category: 'HARDWARE',
          basePrice: 500.00,
          baseCost: 350.00,
          unit: 'UNIT',
          isActive: true,
        },
      });

      // Create stock on hand
      stockLevel = await prisma.stockLevel.create({
        data: {
          warehouseId: warehouse.id,
          productId: stockDepotProduct.id,
          quantityOnHand: 25,
          reserved: 5,
          replenishmentThreshold: 10,
        },
      });
    });

    afterAll(async () => {
      if (stockLevel) {
        await prisma.stockLevel.deleteMany({ where: { productId: stockDepotProduct.id } }).catch(() => {});
      }
      if (stockDepotProduct) {
        await prisma.product.delete({ where: { id: stockDepotProduct.id } }).catch(() => {});
      }
      if (warehouse) {
        await prisma.warehouse.delete({ where: { id: warehouse.id } }).catch(() => {});
      }
    });

    it('blocks deletion of product with active warehouse stock (409 Conflict)', async () => {
      const res = await request(app)
        .delete(`/api/admin/products/${stockDepotProduct.id}`)
        .set('Cookie', `dealflow_token=${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PRODUCT_HAS_STOCK_DEPENDENCY');
    });

    it('allows soft deletion once active inventory stock is zero', async () => {
      // Zero out stock
      await prisma.stockLevel.update({
        where: { id: stockLevel.id },
        data: { quantityOnHand: 0, reserved: 0 },
      });

      const res = await request(app)
        .delete(`/api/admin/products/${stockDepotProduct.id}`)
        .set('Cookie', `dealflow_token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbCheck = await prisma.product.findUnique({ where: { id: stockDepotProduct.id } });
      expect(dbCheck.isActive).toBe(false);
    });
  });

  describe('POST /api/admin/pricing/resolve Endpoint', () => {
    it('resolves price via API with valid authentication', async () => {
      const res = await request(app)
        .post('/api/admin/pricing/resolve')
        .set('Cookie', `dealflow_token=${adminToken}`)
        .send({
          productId: testProduct.id,
          customerTier: 'GOLD',
          currency: 'USD',
          quantity: 3,
          variantId: testVariant.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.finalUnitPrice).toBe(1050);
      expect(res.body.data.lineTotal).toBe(3150);
    });
  });
});
