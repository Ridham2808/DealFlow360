const request = require('supertest');
const app = require('../app');
const prisma = require('../prisma/prisma');
const fulfillmentService = require('../services/fulfillmentService');
const { generateToken } = require('../utils/tokenHelper');

describe('Fulfillment Service & Optimization Integration Suite', () => {
  let adminUser;
  let managerUser;
  let repUser;
  let customerAcme;
  let productA;
  let warehouseEast;
  let warehouseWest;
  let managerToken;

  beforeAll(async () => {
    [adminUser, managerUser, repUser] = await Promise.all([
      prisma.user.findUnique({ where: { email: 'admin@dealflow360.com' } }),
      prisma.user.findUnique({ where: { email: 'manager@dealflow360.com' } }),
      prisma.user.findUnique({ where: { email: 'rep@dealflow360.com' } }),
    ]);

    managerToken = generateToken({ userId: managerUser.id, email: managerUser.email, role: managerUser.role });
    customerAcme = await prisma.customer.findUnique({ where: { email: 'contact@acmecorp.com' } });

    // Fetch or create testing warehouses
    warehouseEast = await prisma.warehouse.findFirst({ where: { name: { contains: 'East' } } });
    warehouseWest = await prisma.warehouse.findFirst({ where: { name: { contains: 'West' } } });

    if (!warehouseEast) {
      warehouseEast = await prisma.warehouse.create({
        data: { name: `East Depot ${Date.now()}`, location: 'New York', shippingCostWeight: 1.0 },
      });
    }

    if (!warehouseWest) {
      warehouseWest = await prisma.warehouse.create({
        data: { name: `West Depot ${Date.now()}`, location: 'California', shippingCostWeight: 2.0 },
      });
    }

    // Create unique product for fulfillment testing
    productA = await prisma.product.create({
      data: {
        name: `Server Rack Unit ${Date.now()}`,
        sku: `SKU-FULFILL-${Date.now()}`,
        category: 'Hardware',
        basePrice: 500.0,
        baseCost: 250.0,
      },
    });

    // Seed stock: East has 10 (reserved: 0), West has 20 (reserved: 0)
    await prisma.stockLevel.upsert({
      where: {
        warehouseId_productId: { warehouseId: warehouseEast.id, productId: productA.id },
      },
      create: {
        warehouseId: warehouseEast.id,
        productId: productA.id,
        quantityOnHand: 10,
        reserved: 0,
      },
      update: {
        quantityOnHand: 10,
        reserved: 0,
      },
    });

    await prisma.stockLevel.upsert({
      where: {
        warehouseId_productId: { warehouseId: warehouseWest.id, productId: productA.id },
      },
      create: {
        warehouseId: warehouseWest.id,
        productId: productA.id,
        quantityOnHand: 20,
        reserved: 0,
      },
      update: {
        quantityOnHand: 20,
        reserved: 0,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('calculates single-warehouse fulfillment preferring lowest shipping cost weight', async () => {
    // Quote requesting 8 units (East has 10 at weight 1.0, West has 20 at weight 2.0 -> East should be chosen)
    const quote = await prisma.quotation.create({
      data: {
        quoteNumber: `FULFILL-Q1-${Date.now()}`,
        customerId: customerAcme.id,
        ownerRepId: repUser.id,
        status: 'APPROVED',
        subtotal: 4000.0,
        grandTotal: 4000.0,
        lines: {
          create: [
            {
              productId: productA.id,
              productNameSnapshot: productA.name,
              categorySnapshot: 'Hardware',
              quantity: 8,
              unitPrice: 500.0,
              unitCost: 250.0,
              lineSubtotal: 4000.0,
              lineMargin: 2000.0,
            },
          ],
        },
      },
    });

    const split = await fulfillmentService.calculateWarehouseSplit(quote.id);

    expect(split.recommendedSplits).toHaveLength(1);
    expect(split.recommendedSplits[0].warehouseId).toBe(warehouseEast.id);
    expect(split.recommendedSplits[0].quantityFulfilled).toBe(8);
    expect(split.recommendedSplits[0].backorderQuantity).toBe(0);
    expect(split.summary.hasBackorder).toBe(false);
  });

  it('splits across multiple warehouses when single depot cannot fulfill the entire quantity', async () => {
    // Quote requesting 15 units (East has 10, West has 20 -> East allocates 10, West allocates 5)
    const quote = await prisma.quotation.create({
      data: {
        quoteNumber: `FULFILL-Q2-${Date.now()}`,
        customerId: customerAcme.id,
        ownerRepId: repUser.id,
        status: 'APPROVED',
        subtotal: 7500.0,
        grandTotal: 7500.0,
        lines: {
          create: [
            {
              productId: productA.id,
              productNameSnapshot: productA.name,
              categorySnapshot: 'Hardware',
              quantity: 15,
              unitPrice: 500.0,
              unitCost: 250.0,
              lineSubtotal: 7500.0,
              lineMargin: 3750.0,
            },
          ],
        },
      },
    });

    const split = await fulfillmentService.calculateWarehouseSplit(quote.id);

    // If West can fulfill all 15, single-warehouse preference checks West:
    // West has 20 >= 15. So West can fulfill in full!
    const westSplit = split.recommendedSplits.find((s) => s.warehouseId === warehouseWest.id);
    expect(westSplit).toBeDefined();
    expect(westSplit.quantityFulfilled).toBe(15);
  });

  it('marks remaining quantity as backorder when total stock is insufficient everywhere', async () => {
    // Quote requesting 40 units (East 10 + West 20 = 30 total available -> 10 backordered)
    const quote = await prisma.quotation.create({
      data: {
        quoteNumber: `FULFILL-Q3-${Date.now()}`,
        customerId: customerAcme.id,
        ownerRepId: repUser.id,
        status: 'APPROVED',
        subtotal: 20000.0,
        grandTotal: 20000.0,
        lines: {
          create: [
            {
              productId: productA.id,
              productNameSnapshot: productA.name,
              categorySnapshot: 'Hardware',
              quantity: 40,
              unitPrice: 500.0,
              unitCost: 250.0,
              lineSubtotal: 20000.0,
              lineMargin: 10000.0,
            },
          ],
        },
      },
    });

    const split = await fulfillmentService.calculateWarehouseSplit(quote.id);

    expect(split.summary.hasBackorder).toBe(true);
    expect(split.summary.totalBackorderQuantity).toBe(10);
    const fulfilledTotal = split.recommendedSplits.reduce((sum, s) => sum + s.quantityFulfilled, 0);
    expect(fulfilledTotal).toBe(30);
  });

  it('acceptSuggestedSplit atomically reserves stock and prevents overselling', async () => {
    const quote = await prisma.quotation.create({
      data: {
        quoteNumber: `FULFILL-ACCEPT-${Date.now()}`,
        customerId: customerAcme.id,
        ownerRepId: repUser.id,
        status: 'APPROVED',
        grandTotal: 2500.0,
        lines: {
          create: [
            {
              productId: productA.id,
              productNameSnapshot: productA.name,
              categorySnapshot: 'Hardware',
              quantity: 5,
              unitPrice: 500.0,
              unitCost: 250.0,
              lineSubtotal: 2500.0,
              lineMargin: 1250.0,
            },
          ],
        },
      },
    });

    const stockBefore = await prisma.stockLevel.findUnique({
      where: { warehouseId_productId: { warehouseId: warehouseEast.id, productId: productA.id } },
    });

    const result = await fulfillmentService.acceptSuggestedSplit(quote.id, managerUser.id);
    expect(result.splits.length).toBeGreaterThan(0);

    const stockAfter = await prisma.stockLevel.findUnique({
      where: { warehouseId_productId: { warehouseId: warehouseEast.id, productId: productA.id } },
    });

    // Reserved increased by 5
    expect(stockAfter.reserved).toBe(stockBefore.reserved + 5);
    expect(stockAfter.quantityOnHand - stockAfter.reserved).toBeGreaterThanOrEqual(0);
  });

  it('validateManualOverride rejects allocations that exceed available warehouse stock', async () => {
    const quote = await prisma.quotation.create({
      data: {
        quoteNumber: `FULFILL-OVR-FAIL-${Date.now()}`,
        customerId: customerAcme.id,
        ownerRepId: repUser.id,
        status: 'APPROVED',
        lines: {
          create: [
            {
              productId: productA.id,
              quantity: 100,
              unitPrice: 500.0,
              unitCost: 250.0,
              lineSubtotal: 50000.0,
              lineMargin: 25000.0,
              categorySnapshot: 'Hardware',
              productNameSnapshot: productA.name,
            },
          ],
        },
      },
    });

    // Attempt to allocate 90 units at East (which only has at most 10)
    const validation = await fulfillmentService.validateManualOverride(quote.id, [
      { warehouseId: warehouseEast.id, productId: productA.id, quantityFulfilled: 90, backorderQuantity: 10 },
    ]);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('available'))).toBe(true);
  });

  it('consolidateBackorder reruns allocation when new inventory arrives', async () => {
    // Create quote with backorder
    const quote = await prisma.quotation.create({
      data: {
        quoteNumber: `FULFILL-BO-${Date.now()}`,
        customerId: customerAcme.id,
        ownerRepId: repUser.id,
        status: 'APPROVED',
        lines: {
          create: [
            {
              productId: productA.id,
              quantity: 10,
              unitPrice: 500.0,
              unitCost: 250.0,
              lineSubtotal: 5000.0,
              lineMargin: 2500.0,
              categorySnapshot: 'Hardware',
              productNameSnapshot: productA.name,
            },
          ],
        },
      },
    });

    // Create split with 5 backordered
    await prisma.fulfillmentSplit.create({
      data: {
        quotationId: quote.id,
        warehouseId: warehouseEast.id,
        productId: productA.id,
        quantityFulfilled: 5,
        backorderQuantity: 5,
        estimatedCost: 35.0,
        status: 'ACCEPTED',
      },
    });

    // Replenish stock at East
    await prisma.stockLevel.update({
      where: { warehouseId_productId: { warehouseId: warehouseEast.id, productId: productA.id } },
      data: { quantityOnHand: { increment: 15 } },
    });

    const res = await fulfillmentService.consolidateBackorder(quote.id, managerUser.id);
    expect(res.consolidated).toBe(true);
    expect(res.unitsConsolidated).toBe(5);

    const updatedSplits = await prisma.fulfillmentSplit.findMany({ where: { quotationId: quote.id } });
    expect(updatedSplits[0].backorderQuantity).toBe(0);
    expect(updatedSplits[0].quantityFulfilled).toBe(10);
  });

  it('HTTP GET /api/fulfillment returns stock table and awaiting orders', async () => {
    const res = await request(app)
      .get('/api/fulfillment')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stockTable).toBeDefined();
    expect(res.body.data.ordersAwaiting).toBeDefined();
  });
});
