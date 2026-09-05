const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting idempotent DealFlow360 database seed...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Seed Customers (Acme Corp with Gold tier, Beta Industries with Silver tier)
  const acme = await prisma.customer.upsert({
    where: { email: 'contact@acmecorp.com' },
    update: {
      name: 'Acme Corp',
      tier: 'GOLD',
      isActive: true,
    },
    create: {
      name: 'Acme Corp',
      email: 'contact@acmecorp.com',
      tier: 'GOLD',
      isActive: true,
    },
  });

  const beta = await prisma.customer.upsert({
    where: { email: 'contact@betaindustries.com' },
    update: {
      name: 'Beta Industries',
      tier: 'SILVER',
      isActive: true,
    },
    create: {
      name: 'Beta Industries',
      email: 'contact@betaindustries.com',
      tier: 'SILVER',
      isActive: true,
    },
  });
  console.log(`[Seed] Seeded Customers: ${acme.name} (Gold), ${beta.name} (Silver)`);

  // 2. Seed Users across all 5 roles
  const users = [
    {
      name: 'Alex Vance',
      email: 'admin@dealflow360.com',
      role: 'ADMIN',
    },
    {
      name: 'Marcus Brody',
      email: 'manager@dealflow360.com',
      role: 'SALES_MANAGER',
    },
    {
      name: 'Elena Rostova',
      email: 'rep@dealflow360.com',
      role: 'SALES_REP',
    },
    {
      name: 'Fiona Gallagher',
      email: 'finance@dealflow360.com',
      role: 'FINANCE',
    },
    {
      name: 'Sarah Connor',
      email: 'customer@acmecorp.com',
      role: 'CUSTOMER',
      customerTier: 'GOLD',
      customerId: acme.id,
    },
  ];

  const seededUsers = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        status: 'ACTIVE',
        passwordHash,
        customerTier: u.customerTier || null,
        customerId: u.customerId || null,
        isActive: true,
      },
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        status: 'ACTIVE',
        customerTier: u.customerTier || null,
        customerId: u.customerId || null,
        isActive: true,
      },
    });
    seededUsers[u.role] = user;
    console.log(`[Seed] Seeded User: ${user.email} (${user.role})`);
  }

  // 3. Seed Warehouses (Main Warehouse and East Depot)
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { name: 'Main Warehouse' },
    update: { location: 'Austin, TX', shippingCostWeight: 1.00, isActive: true },
    create: { name: 'Main Warehouse', location: 'Austin, TX', shippingCostWeight: 1.00, isActive: true },
  });

  const eastDepot = await prisma.warehouse.upsert({
    where: { name: 'East Depot' },
    update: { location: 'Allentown, PA', shippingCostWeight: 1.25, isActive: true },
    create: { name: 'East Depot', location: 'Allentown, PA', shippingCostWeight: 1.25, isActive: true },
  });
  console.log(`[Seed] Seeded Warehouses: ${mainWarehouse.name}, ${eastDepot.name}`);

  // 4. Seed Products
  // Laptop Pro 14, Docking Station, Onsite Setup Service, and Care Plan subscription
  const prodLaptop = await prisma.product.upsert({
    where: { sku: 'HW-LAP-14' },
    update: {
      name: 'Laptop Pro 14',
      category: 'Hardware',
      basePrice: 1999.00,
      baseCost: 1400.00,
      unit: 'UNIT',
      taxPercent: 8.25,
      description: 'High-performance 14-inch professional laptop with M-series processor',
      isRecurringEligible: false,
      isActive: true,
    },
    create: {
      name: 'Laptop Pro 14',
      sku: 'HW-LAP-14',
      category: 'Hardware',
      basePrice: 1999.00,
      baseCost: 1400.00,
      unit: 'UNIT',
      taxPercent: 8.25,
      description: 'High-performance 14-inch professional laptop with M-series processor',
      isRecurringEligible: false,
      isActive: true,
    },
  });

  const prodDock = await prisma.product.upsert({
    where: { sku: 'HW-DCK-01' },
    update: {
      name: 'Docking Station',
      category: 'Hardware',
      basePrice: 249.00,
      baseCost: 130.00,
      unit: 'UNIT',
      taxPercent: 8.25,
      description: 'Thunderbolt 4 dual 4K display universal docking station',
      isRecurringEligible: false,
      isActive: true,
    },
    create: {
      name: 'Docking Station',
      sku: 'HW-DCK-01',
      category: 'Hardware',
      basePrice: 249.00,
      baseCost: 130.00,
      unit: 'UNIT',
      taxPercent: 8.25,
      description: 'Thunderbolt 4 dual 4K display universal docking station',
      isRecurringEligible: false,
      isActive: true,
    },
  });

  const prodService = await prisma.product.upsert({
    where: { sku: 'SRV-SETUP-01' },
    update: {
      name: 'Onsite Setup Service',
      category: 'Services',
      basePrice: 500.00,
      baseCost: 200.00,
      unit: 'HOURS',
      taxPercent: 0.00,
      description: 'Professional on-site device setup, migration, and network configuration',
      isRecurringEligible: false,
      isActive: true,
    },
    create: {
      name: 'Onsite Setup Service',
      sku: 'SRV-SETUP-01',
      category: 'Services',
      basePrice: 500.00,
      baseCost: 200.00,
      unit: 'HOURS',
      taxPercent: 0.00,
      description: 'Professional on-site device setup, migration, and network configuration',
      isRecurringEligible: false,
      isActive: true,
    },
  });

  const prodCarePlan = await prisma.product.upsert({
    where: { sku: 'SUB-CARE-01' },
    update: {
      name: 'Care Plan',
      category: 'Services',
      basePrice: 49.00,
      baseCost: 10.00,
      unit: 'SEAT/MONTH',
      taxPercent: 0.00,
      description: '24/7 priority enterprise warranty, hardware replacement, and telemetry support',
      isRecurringEligible: true,
      isActive: true,
    },
    create: {
      name: 'Care Plan',
      sku: 'SUB-CARE-01',
      category: 'Services',
      basePrice: 49.00,
      baseCost: 10.00,
      unit: 'SEAT/MONTH',
      taxPercent: 0.00,
      description: '24/7 priority enterprise warranty, hardware replacement, and telemetry support',
      isRecurringEligible: true,
      isActive: true,
    },
  });
  console.log('[Seed] Seeded Products (Laptop Pro 14, Docking Station, Setup Service, Care Plan)');

  // 5. Seed Stock across both warehouses for split fulfillment
  const stockData = [
    { warehouseId: mainWarehouse.id, productId: prodLaptop.id, onHand: 40, reserved: 5, threshold: 10 },
    { warehouseId: eastDepot.id, productId: prodLaptop.id, onHand: 25, reserved: 2, threshold: 10 },
    { warehouseId: mainWarehouse.id, productId: prodDock.id, onHand: 100, reserved: 10, threshold: 20 },
    { warehouseId: eastDepot.id, productId: prodDock.id, onHand: 60, reserved: 4, threshold: 15 },
  ];

  for (const s of stockData) {
    await prisma.stockLevel.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: s.warehouseId,
          productId: s.productId,
        },
      },
      update: {
        quantityOnHand: s.onHand,
        reserved: s.reserved,
        replenishmentThreshold: s.threshold,
      },
      create: {
        warehouseId: s.warehouseId,
        productId: s.productId,
        quantityOnHand: s.onHand,
        reserved: s.reserved,
        replenishmentThreshold: s.threshold,
      },
    });
  }
  console.log('[Seed] Seeded Initial Stock Levels across Main Warehouse and East Depot');

  // 6. Seed Discount Tiers (Bronze 5%, Silver 10%, Gold 15%)
  const discountTiers = [
    { customerTier: 'BRONZE', maxDiscountPercent: 5.00 },
    { customerTier: 'SILVER', maxDiscountPercent: 10.00 },
    { customerTier: 'GOLD', maxDiscountPercent: 15.00 },
  ];

  for (const dt of discountTiers) {
    await prisma.discountTier.upsert({
      where: { customerTier: dt.customerTier },
      update: { maxDiscountPercent: dt.maxDiscountPercent, isActive: true },
      create: { customerTier: dt.customerTier, maxDiscountPercent: dt.maxDiscountPercent, isActive: true },
    });
  }
  console.log('[Seed] Seeded Discount Tiers (Bronze 5%, Silver 10%, Gold 15%)');

  // 7. Seed Category Discount Ceilings (Hardware 15%, Services 10%)
  const catCeilings = [
    { category: 'Hardware', maxDiscountPercent: 15.00 },
    { category: 'Services', maxDiscountPercent: 10.00 },
  ];

  for (const cc of catCeilings) {
    await prisma.categoryDiscountCeiling.upsert({
      where: { category: cc.category },
      update: { maxDiscountPercent: cc.maxDiscountPercent, isActive: true },
      create: { category: cc.category, maxDiscountPercent: cc.maxDiscountPercent, isActive: true },
    });
  }
  console.log('[Seed] Seeded Category Discount Ceilings (Hardware 15%, Services 10%)');

  // 8. Seed Approval Chain Rules (No approval, manager approval, manager-then-finance approval)
  const approvalRules = [
    { id: 'rule-auto-approved', minimumOverage: 0.00, maximumOverage: 0.00, requiredRole: 'SALES_REP', orderIndex: 1 },
    { id: 'rule-manager-required', minimumOverage: 0.01, maximumOverage: 10.00, requiredRole: 'SALES_MANAGER', orderIndex: 1 },
    { id: 'rule-finance-escalation', minimumOverage: 10.01, maximumOverage: 100.00, requiredRole: 'FINANCE', orderIndex: 2 },
  ];

  for (const ar of approvalRules) {
    await prisma.approvalChainRule.upsert({
      where: { id: ar.id },
      update: {
        minimumOverage: ar.minimumOverage,
        maximumOverage: ar.maximumOverage,
        requiredRole: ar.requiredRole,
        orderIndex: ar.orderIndex,
        isActive: true,
      },
      create: {
        id: ar.id,
        minimumOverage: ar.minimumOverage,
        maximumOverage: ar.maximumOverage,
        requiredRole: ar.requiredRole,
        orderIndex: ar.orderIndex,
        isActive: true,
      },
    });
  }
  console.log('[Seed] Seeded Approval Chain Rules (No approval, manager, manager-then-finance)');

  // 9. Seed Subscription Plans (Monthly, Quarterly, Yearly)
  const subPlans = [
    { id: 'plan-care-monthly', name: 'Care Plan Monthly', billingCycle: 'MONTHLY', price: 49.00 },
    { id: 'plan-care-quarterly', name: 'Care Plan Quarterly', billingCycle: 'QUARTERLY', price: 139.00 },
    { id: 'plan-care-yearly', name: 'Care Plan Annual', billingCycle: 'YEARLY', price: 499.00 },
  ];

  for (const sp of subPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: sp.id },
      update: { name: sp.name, billingCycle: sp.billingCycle, price: sp.price, isActive: true },
      create: { id: sp.id, name: sp.name, billingCycle: sp.billingCycle, price: sp.price, isActive: true },
    });
  }
  console.log('[Seed] Seeded Subscription Plans (Monthly, Quarterly, Yearly)');

  // 10. Seed Deterministic Quotation Q-1042 for Acme Corp
  const existingQuote = await prisma.quotation.findUnique({
    where: { quoteNumber: 'Q-1042' },
  });

  if (!existingQuote) {
    const quote1042 = await prisma.quotation.create({
      data: {
        quoteNumber: 'Q-1042',
        customerId: acme.id,
        ownerRepId: seededUsers.SALES_REP.id,
        currency: 'USD',
        status: 'DRAFT',
        subtotal: 4247.00,
        discountTotal: 250.00,
        taxTotal: 329.75,
        grandTotal: 4326.75,
        totalCost: 2930.00,
        marginAmount: 1317.00,
        marginPercentage: 31.01,
        blendedRiskScore: 12,
        riskLevel: 'LOW',
        version: 1,
        lines: {
          create: [
            {
              productId: prodLaptop.id,
              quantity: 2,
              unitPrice: 1999.00,
              unitCost: 1400.00,
              discountPercent: 5.00,
              lineDiscountLimit: 15.00,
              taxPercent: 8.25,
              lineSubtotal: 3998.00,
              lineDiscountAmount: 199.90,
              lineMargin: 1198.00,
              isRecurring: false,
              categorySnapshot: 'Hardware',
              productNameSnapshot: 'Laptop Pro 14',
            },
            {
              productId: prodDock.id,
              quantity: 1,
              unitPrice: 249.00,
              unitCost: 130.00,
              discountPercent: 10.00,
              lineDiscountLimit: 15.00,
              taxPercent: 8.25,
              lineSubtotal: 249.00,
              lineDiscountAmount: 24.90,
              lineMargin: 119.00,
              isRecurring: false,
              categorySnapshot: 'Hardware',
              productNameSnapshot: 'Docking Station',
            },
          ],
        },
      },
    });
    console.log(`[Seed] Seeded Deterministic Quotation: ${quote1042.quoteNumber} for Acme Corp`);
  } else {
    console.log(`[Seed] Quotation Q-1042 already exists, skipping creation to preserve idempotency.`);
  }

  console.log('[Seed] DealFlow360 Database seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
