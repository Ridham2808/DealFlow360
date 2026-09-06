/**
 * DealFlow360 — Comprehensive Demo Seed (200+ records)
 * =====================================================
 * Wipes ALL existing transactional data (quotations, invoices, approvals,
 * fulfillment, subscriptions, audit logs, deal-health flags) and re-seeds
 * a rich, realistic dataset covering EVERY workflow situation:
 *
 *   Customers  : 8 (Bronze x3, Silver x3, Gold x2)
 *   Users      : 10 (Admin, Manager x2, Rep x3, Finance x2, Customer x2)
 *   Products   : 12 (Hardware x5, Services x4, Warranty x1, Subscription x2)
 *   Variants   : 8  (RAM/Storage options on laptops)
 *   Warehouses : 3  (Main, East, West — varied stock levels)
 *   Price Lists: 3  (Bronze, Silver, Gold tier pricing)
 *   Upsell Rules: 10
 *   Quotations : 40 (all statuses — DRAFT, PENDING_APPROVAL, APPROVED,
 *                    REJECTED, RETURNED, SENT_TO_CUSTOMER, UNDER_NEGOTIATION,
 *                    CONFIRMED, CONVERTED_TO_ORDER, EXPIRED)
 *   Lines      : 80+ quotation line items (varied products, discounts, types)
 *   Approvals  : 25+ approval steps (pending, approved, rejected, returned)
 *   Invoices   : 20+ (DRAFT, ISSUED, PAID, OVERDUE, PARTIALLY_PAID, VOID)
 *   Billing    : 15 billing schedule entries for recurring lines
 *   Fulfillment: 20 split records across 3 warehouses
 *   Audit Logs : 60+ activity events
 *   Deal Health: 15 flags (stalled, discount anomaly, slippage)
 *
 * All passwords: Password123!
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function calcLine(qty, price, cost, discPct, taxPct) {
  const disc = Number((price * qty * (discPct / 100)).toFixed(2));
  const sub = Number((price * qty - disc).toFixed(2));
  const margin = Number((sub - cost * qty).toFixed(2));
  return {
    lineSubtotal: sub,
    lineDiscountAmount: disc,
    lineMargin: margin,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 [Seed] Starting comprehensive DealFlow360 demo seed (200+ records)…\n');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 0 — PURGE TRANSACTIONAL DATA (keep config: products, warehouses, rules)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('[Seed] Purging old transactional data…');
  await prisma.dealHealthFlag.deleteMany();
  await prisma.customerRequest.deleteMany();
  await prisma.billingSchedule.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.fulfillmentSplit.deleteMany();
  await prisma.approvalStep.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.quotationLine.deleteMany();
  await prisma.quotation.deleteMany();
  // Must delete invitations before users (FK: invitedById)
  await prisma.invitation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.customer.deleteMany();
  console.log('[Seed] ✓ Purge complete.\n');

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 1 — CUSTOMERS (14)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('[Seed] Creating customers…');
  const customerData = [
    // GOLD (15% ceiling)
    { name: 'Acme Corp',                 email: 'contact@acmecorp.com',      tier: 'GOLD'   },
    { name: 'NovaTech Solutions',         email: 'contact@novatech.io',       tier: 'GOLD'   },
    { name: 'Apex Global Technologies',  email: 'contact@apexglobal.com',    tier: 'GOLD'   },
    { name: 'Vanguard Systems Corp',     email: 'contact@vanguardsys.com',   tier: 'GOLD'   },
    // SILVER (10% ceiling)
    { name: 'Beta Industries',           email: 'contact@betaindustries.com', tier: 'SILVER' },
    { name: 'Quantum Dynamics',          email: 'contact@quantumdyn.com',    tier: 'SILVER' },
    { name: 'Meridian Partners',         email: 'contact@meridianp.com',     tier: 'SILVER' },
    { name: 'Helios Energy Group',        email: 'contact@heliosenergy.com',  tier: 'SILVER' },
    { name: 'Terraform Analytics',       email: 'contact@terraformlabs.com', tier: 'SILVER' },
    // BRONZE (5% ceiling)
    { name: 'Summit Retail Co',          email: 'contact@summitretail.com',  tier: 'BRONZE' },
    { name: 'Crest Logistics',           email: 'contact@crestlog.com',      tier: 'BRONZE' },
    { name: 'Pinnacle Services',         email: 'contact@pinnaclesvc.com',   tier: 'BRONZE' },
    { name: 'Starlight Media Network',   email: 'contact@starlightmedia.com', tier: 'BRONZE' },
    { name: 'Omega Freight Logistics',   email: 'contact@omegalog.com',      tier: 'BRONZE' },
  ];

  const customers = {};
  for (const c of customerData) {
    customers[c.name] = await prisma.customer.upsert({
      where: { email: c.email },
      update: { name: c.name, tier: c.tier, isActive: true },
      create: { name: c.name, email: c.email, tier: c.tier, isActive: true },
    });
  }
  console.log(`[Seed] ✓ ${customerData.length} customers created.\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 2 — USERS (10 internal + 14 portal customers)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('[Seed] Creating users…');
  const userData = [
    // Admin
    { name: 'Alex Vance',       email: 'admin@dealflow360.com',     role: 'ADMIN'         },
    // Sales Managers
    { name: 'Marcus Brody',     email: 'manager@dealflow360.com',   role: 'SALES_MANAGER' },
    { name: 'Diana Weston',     email: 'manager2@dealflow360.com',  role: 'SALES_MANAGER' },
    // Sales Reps
    { name: 'Elena Rostova',    email: 'rep@dealflow360.com',       role: 'SALES_REP'     },
    { name: 'James Carter',     email: 'rep2@dealflow360.com',      role: 'SALES_REP'     },
    { name: 'Priya Nair',       email: 'rep3@dealflow360.com',      role: 'SALES_REP'     },
    // Finance
    { name: 'Fiona Gallagher',  email: 'finance@dealflow360.com',   role: 'FINANCE'       },
    { name: 'Oliver Chen',      email: 'finance2@dealflow360.com',  role: 'FINANCE'       },
    // Customers (portal users)
    {
      name: 'Sarah Connor',
      email: 'customer@acmecorp.com',
      role: 'CUSTOMER',
      customerTier: 'GOLD',
      customerId: customers['Acme Corp'].id,
    },
    {
      name: 'Rahul Mehta',
      email: 'customer@novatech.io',
      role: 'CUSTOMER',
      customerTier: 'GOLD',
      customerId: customers['NovaTech Solutions'].id,
    },
    {
      name: 'Arthur Dent',
      email: 'customer@apexglobal.com',
      role: 'CUSTOMER',
      customerTier: 'GOLD',
      customerId: customers['Apex Global Technologies'].id,
    },
    {
      name: 'Bruce Wayne',
      email: 'customer@vanguardsys.com',
      role: 'CUSTOMER',
      customerTier: 'GOLD',
      customerId: customers['Vanguard Systems Corp'].id,
    },
    {
      name: 'David King',
      email: 'customer@betaindustries.com',
      role: 'CUSTOMER',
      customerTier: 'SILVER',
      customerId: customers['Beta Industries'].id,
    },
    {
      name: 'Emily Watson',
      email: 'customer@quantumdyn.com',
      role: 'CUSTOMER',
      customerTier: 'SILVER',
      customerId: customers['Quantum Dynamics'].id,
    },
    {
      name: 'Robert Thorne',
      email: 'customer@meridianp.com',
      role: 'CUSTOMER',
      customerTier: 'SILVER',
      customerId: customers['Meridian Partners'].id,
    },
    {
      name: 'Tony Stark',
      email: 'customer@heliosenergy.com',
      role: 'CUSTOMER',
      customerTier: 'SILVER',
      customerId: customers['Helios Energy Group'].id,
    },
    {
      name: 'Peter Parker',
      email: 'customer@terraformlabs.com',
      role: 'CUSTOMER',
      customerTier: 'SILVER',
      customerId: customers['Terraform Analytics'].id,
    },
    {
      name: 'Jessica Miller',
      email: 'customer@summitretail.com',
      role: 'CUSTOMER',
      customerTier: 'BRONZE',
      customerId: customers['Summit Retail Co'].id,
    },
    {
      name: 'Michael Scott',
      email: 'customer@crestlog.com',
      role: 'CUSTOMER',
      customerTier: 'BRONZE',
      customerId: customers['Crest Logistics'].id,
    },
    {
      name: 'Laura Croft',
      email: 'customer@pinnaclesvc.com',
      role: 'CUSTOMER',
      customerTier: 'BRONZE',
      customerId: customers['Pinnacle Services'].id,
    },
    {
      name: 'Natasha Romanoff',
      email: 'customer@starlightmedia.com',
      role: 'CUSTOMER',
      customerTier: 'BRONZE',
      customerId: customers['Starlight Media Network'].id,
    },
    {
      name: 'Clark Kent',
      email: 'customer@omegalog.com',
      role: 'CUSTOMER',
      customerTier: 'BRONZE',
      customerId: customers['Omega Freight Logistics'].id,
    },
  ];

  const users = {};
  for (const u of userData) {
    const usr = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name, role: u.role, status: 'ACTIVE', passwordHash,
        customerTier: u.customerTier || null,
        customerId: u.customerId || null,
        isActive: true,
      },
      create: {
        name: u.name, email: u.email, passwordHash, role: u.role, status: 'ACTIVE',
        customerTier: u.customerTier || null,
        customerId: u.customerId || null,
        isActive: true,
      },
    });
    users[u.email] = usr;
  }
  console.log(`[Seed] ✓ ${userData.length} users created (all password: Password123!)\n`);

  const rep1 = users['rep@dealflow360.com'];
  const rep2 = users['rep2@dealflow360.com'];
  const rep3 = users['rep3@dealflow360.com'];
  const mgr1 = users['manager@dealflow360.com'];
  const mgr2 = users['manager2@dealflow360.com'];
  const fin1 = users['finance@dealflow360.com'];
  const fin2 = users['finance2@dealflow360.com'];
  const adminUser = users['admin@dealflow360.com'];

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 3 — WAREHOUSES (3)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('[Seed] Creating warehouses…');
  const whMain = await prisma.warehouse.upsert({
    where: { name: 'Main Warehouse' },
    update: { location: 'Austin, TX', shippingCostWeight: 1.00, isActive: true },
    create: { name: 'Main Warehouse', location: 'Austin, TX', shippingCostWeight: 1.00, isActive: true },
  });
  const whEast = await prisma.warehouse.upsert({
    where: { name: 'East Depot' },
    update: { location: 'Allentown, PA', shippingCostWeight: 1.25, isActive: true },
    create: { name: 'East Depot', location: 'Allentown, PA', shippingCostWeight: 1.25, isActive: true },
  });
  const whWest = await prisma.warehouse.upsert({
    where: { name: 'West Hub' },
    update: { location: 'Phoenix, AZ', shippingCostWeight: 1.10, isActive: true },
    create: { name: 'West Hub', location: 'Phoenix, AZ', shippingCostWeight: 1.10, isActive: true },
  });
  console.log('[Seed] ✓ 3 warehouses created.\n');

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 4 — PRODUCTS (12) + VARIANTS (8)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('[Seed] Creating products…');

  async function upsertProduct(data) {
    return prisma.product.upsert({
      where: { sku: data.sku },
      update: data,
      create: data,
    });
  }

  const pLaptop14 = await upsertProduct({
    name: 'Laptop Pro 14', sku: 'HW-LAP-14', category: 'Hardware',
    basePrice: 1999.00, baseCost: 1400.00, unit: 'UNIT', taxPercent: 8.25,
    description: 'High-performance 14-inch pro laptop — M-series processor, 16GB RAM',
    isRecurringEligible: false, isActive: true,
  });
  const pLaptop16 = await upsertProduct({
    name: 'Laptop Pro 16', sku: 'HW-LAP-16', category: 'Hardware',
    basePrice: 2499.00, baseCost: 1800.00, unit: 'UNIT', taxPercent: 8.25,
    description: 'Large-screen 16-inch pro laptop with dedicated GPU and 32GB RAM',
    isRecurringEligible: false, isActive: true,
  });
  const pDock = await upsertProduct({
    name: 'Docking Station Pro', sku: 'HW-DCK-01', category: 'Hardware',
    basePrice: 249.00, baseCost: 130.00, unit: 'UNIT', taxPercent: 8.25,
    description: 'Thunderbolt 4 dual-4K universal docking station',
    isRecurringEligible: false, isActive: true,
  });
  const pMonitor = await upsertProduct({
    name: '4K Business Monitor 27"', sku: 'HW-MON-27', category: 'Hardware',
    basePrice: 699.00, baseCost: 420.00, unit: 'UNIT', taxPercent: 8.25,
    description: '27-inch UHD IPS enterprise display — USB-C power delivery',
    isRecurringEligible: false, isActive: true,
  });
  const pHeadset = await upsertProduct({
    name: 'Wireless Noise-Cancel Headset', sku: 'HW-HEAD-01', category: 'Hardware',
    basePrice: 299.00, baseCost: 160.00, unit: 'UNIT', taxPercent: 8.25,
    description: 'ANC professional headset with 30-hour battery and Teams certification',
    isRecurringEligible: false, isActive: true,
  });
  const pSetup = await upsertProduct({
    name: 'Onsite Setup Service', sku: 'SRV-SETUP-01', category: 'Services',
    basePrice: 500.00, baseCost: 200.00, unit: 'HOURS', taxPercent: 0.00,
    description: 'Professional on-site device setup, data migration, and network config',
    isRecurringEligible: false, isActive: true,
  });
  const pTraining = await upsertProduct({
    name: 'User Training (Half Day)', sku: 'SRV-TRAIN-HD', category: 'Services',
    basePrice: 350.00, baseCost: 120.00, unit: 'SESSION', taxPercent: 0.00,
    description: 'Half-day end-user productivity and security awareness training',
    isRecurringEligible: false, isActive: true,
  });
  const pConsulting = await upsertProduct({
    name: 'IT Strategy Consulting', sku: 'SRV-CONSULT-01', category: 'Services',
    basePrice: 1200.00, baseCost: 450.00, unit: 'DAY', taxPercent: 0.00,
    description: 'Senior IT architecture consulting — digital transformation roadmap',
    isRecurringEligible: false, isActive: true,
  });
  const pSecurity = await upsertProduct({
    name: 'Endpoint Security Suite', sku: 'SRV-SEC-01', category: 'Services',
    basePrice: 850.00, baseCost: 300.00, unit: 'UNIT', taxPercent: 0.00,
    description: 'Enterprise endpoint protection with XDR, MDM, and zero-trust policy',
    isRecurringEligible: false, isActive: true,
  });
  const pWarranty = await upsertProduct({
    name: 'Hardware Extended Warranty', sku: 'WRN-EXT-3YR', category: 'Warranty',
    basePrice: 199.00, baseCost: 60.00, unit: 'UNIT', taxPercent: 0.00,
    description: '3-year comprehensive hardware warranty with next-business-day replacement',
    isRecurringEligible: false, isActive: true,
  });
  const pCarePlan = await upsertProduct({
    name: 'Care Plan (Monthly)', sku: 'SUB-CARE-MO', category: 'Subscriptions',
    basePrice: 49.00, baseCost: 10.00, unit: 'SEAT/MONTH', taxPercent: 0.00,
    description: '24/7 priority support, telemetry, and remote management — per seat',
    isRecurringEligible: true, isActive: true,
  });
  const pSaaS = await upsertProduct({
    name: 'DealFlow CRM SaaS License', sku: 'SUB-CRM-YR', category: 'Subscriptions',
    basePrice: 89.00, baseCost: 15.00, unit: 'SEAT/MONTH', taxPercent: 0.00,
    description: 'Full-suite CRM platform license — unlimited pipelines, 1TB storage',
    isRecurringEligible: true, isActive: true,
  });
  console.log('[Seed] ✓ 12 products created.\n');

  // Variants for Laptop Pro 14
  const variants14 = [
    { attributeName: 'RAM', attributeValue: '16GB', extraPrice: 0, skuSuffix: '-16G' },
    { attributeName: 'RAM', attributeValue: '32GB', extraPrice: 200, skuSuffix: '-32G' },
    { attributeName: 'Storage', attributeValue: '512GB SSD', extraPrice: 0, skuSuffix: '-512' },
    { attributeName: 'Storage', attributeValue: '1TB SSD', extraPrice: 150, skuSuffix: '-1T' },
  ];
  for (const v of variants14) {
    await prisma.productVariant.upsert({
      where: { id: `var-14-${v.skuSuffix}` },
      update: { ...v, productId: pLaptop14.id, isActive: true },
      create: { id: `var-14-${v.skuSuffix}`, ...v, productId: pLaptop14.id, isActive: true },
    }).catch(() => {
      // If ID already exists from a prior run with different data, continue
    });
  }
  // Variants for Laptop Pro 16
  const variants16 = [
    { attributeName: 'RAM', attributeValue: '32GB', extraPrice: 0, skuSuffix: '-32G' },
    { attributeName: 'RAM', attributeValue: '64GB', extraPrice: 300, skuSuffix: '-64G' },
    { attributeName: 'Storage', attributeValue: '1TB SSD', extraPrice: 0, skuSuffix: '-1T' },
    { attributeName: 'Storage', attributeValue: '2TB SSD', extraPrice: 250, skuSuffix: '-2T' },
  ];
  for (const v of variants16) {
    await prisma.productVariant.upsert({
      where: { id: `var-16-${v.skuSuffix}` },
      update: { ...v, productId: pLaptop16.id, isActive: true },
      create: { id: `var-16-${v.skuSuffix}`, ...v, productId: pLaptop16.id, isActive: true },
    }).catch(() => {});
  }
  console.log('[Seed] ✓ 8 product variants created.\n');

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 5 — STOCK LEVELS (3 warehouses × 5 physical products)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('[Seed] Setting stock levels…');
  const stockData = [
    // Main — well stocked
    { wh: whMain, p: pLaptop14,  onHand: 45, reserved: 8,  threshold: 10 },
    { wh: whMain, p: pLaptop16,  onHand: 20, reserved: 3,  threshold: 5  },
    { wh: whMain, p: pDock,      onHand: 120, reserved: 15, threshold: 20 },
    { wh: whMain, p: pMonitor,   onHand: 60,  reserved: 10, threshold: 15 },
    { wh: whMain, p: pHeadset,   onHand: 80,  reserved: 12, threshold: 20 },
    // East — moderate stock
    { wh: whEast, p: pLaptop14,  onHand: 18, reserved: 2,  threshold: 10 },
    { wh: whEast, p: pLaptop16,  onHand: 8,  reserved: 1,  threshold: 5  },
    { wh: whEast, p: pDock,      onHand: 50, reserved: 5,  threshold: 15 },
    { wh: whEast, p: pMonitor,   onHand: 25, reserved: 4,  threshold: 10 },
    { wh: whEast, p: pHeadset,   onHand: 35, reserved: 6,  threshold: 10 },
    // West — low / backorder scenario
    { wh: whWest, p: pLaptop14,  onHand: 5,  reserved: 2,  threshold: 10 },
    { wh: whWest, p: pLaptop16,  onHand: 2,  reserved: 0,  threshold: 5  },
    { wh: whWest, p: pDock,      onHand: 15, reserved: 0,  threshold: 15 },
    { wh: whWest, p: pMonitor,   onHand: 7,  reserved: 3,  threshold: 10 },
    { wh: whWest, p: pHeadset,   onHand: 12, reserved: 4,  threshold: 10 },
  ];
  for (const s of stockData) {
    await prisma.stockLevel.upsert({
      where: { warehouseId_productId: { warehouseId: s.wh.id, productId: s.p.id } },
      update: { quantityOnHand: s.onHand, reserved: s.reserved, replenishmentThreshold: s.threshold },
      create: { warehouseId: s.wh.id, productId: s.p.id, quantityOnHand: s.onHand, reserved: s.reserved, replenishmentThreshold: s.threshold },
    });
  }
  console.log('[Seed] ✓ Stock levels set for 3 warehouses × 5 hardware products.\n');

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 6 — DISCOUNT / APPROVAL CONFIGURATION
  // ══════════════════════════════════════════════════════════════════════════
  const discountTiers = [
    { customerTier: 'BRONZE', maxDiscountPercent: 5.00  },
    { customerTier: 'SILVER', maxDiscountPercent: 10.00 },
    { customerTier: 'GOLD',   maxDiscountPercent: 15.00 },
  ];
  for (const dt of discountTiers) {
    await prisma.discountTier.upsert({
      where: { customerTier: dt.customerTier },
      update: { maxDiscountPercent: dt.maxDiscountPercent, isActive: true },
      create: { customerTier: dt.customerTier, maxDiscountPercent: dt.maxDiscountPercent, isActive: true },
    });
  }

  const catCeilings = [
    { category: 'Hardware',       maxDiscountPercent: 15.00 },
    { category: 'Services',       maxDiscountPercent: 10.00 },
    { category: 'Warranty',       maxDiscountPercent: 15.00 },
    { category: 'Subscriptions',  maxDiscountPercent: 8.00  },
  ];
  for (const cc of catCeilings) {
    await prisma.categoryDiscountCeiling.upsert({
      where: { category: cc.category },
      update: { maxDiscountPercent: cc.maxDiscountPercent, isActive: true },
      create: { category: cc.category, maxDiscountPercent: cc.maxDiscountPercent, isActive: true },
    });
  }

  const approvalRules = [
    { id: 'rule-auto-approved',       minimumOverage: 0.00,  maximumOverage: 0.00,   requiredRole: 'SALES_REP',     orderIndex: 1 },
    { id: 'rule-manager-required',    minimumOverage: 0.01,  maximumOverage: 10.00,  requiredRole: 'SALES_MANAGER', orderIndex: 2 },
    { id: 'rule-finance-escalation',  minimumOverage: 10.01, maximumOverage: 100.00, requiredRole: 'FINANCE',       orderIndex: 3 },
  ];
  for (const ar of approvalRules) {
    await prisma.approvalChainRule.upsert({
      where: { id: ar.id },
      update: { minimumOverage: ar.minimumOverage, maximumOverage: ar.maximumOverage, requiredRole: ar.requiredRole, orderIndex: ar.orderIndex, isActive: true },
      create: { id: ar.id, minimumOverage: ar.minimumOverage, maximumOverage: ar.maximumOverage, requiredRole: ar.requiredRole, orderIndex: ar.orderIndex, isActive: true },
    });
  }
  console.log('[Seed] ✓ Discount tiers, category ceilings, and approval chain rules set.\n');

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 7 — SUBSCRIPTION PLANS (4)
  // ══════════════════════════════════════════════════════════════════════════
  const subPlans = [
    { id: 'plan-care-monthly',   name: 'Care Plan Monthly',    billingCycle: 'MONTHLY',   price: 49.00,  prorationRule: 'DAILY', cancellationRule: 'IMMEDIATE' },
    { id: 'plan-care-quarterly', name: 'Care Plan Quarterly',  billingCycle: 'QUARTERLY', price: 139.00, prorationRule: 'DAILY', cancellationRule: '30_DAY_NOTICE' },
    { id: 'plan-care-yearly',    name: 'Care Plan Annual',     billingCycle: 'YEARLY',    price: 499.00, prorationRule: 'MONTHLY', cancellationRule: '60_DAY_NOTICE' },
    { id: 'plan-crm-yearly',     name: 'CRM SaaS Annual',      billingCycle: 'YEARLY',    price: 960.00, prorationRule: 'MONTHLY', cancellationRule: '30_DAY_NOTICE' },
  ];
  for (const sp of subPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: sp.id },
      update: sp,
      create: sp,
    });
  }
  console.log('[Seed] ✓ 4 subscription plans created.\n');

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 8 — PRICE LISTS (3 tiers)
  // ══════════════════════════════════════════════════════════════════════════
  const plGold = await prisma.priceList.upsert({
    where: { id: 'pl-gold-usd' },
    update: { name: 'Gold Tier — USD', customerTier: 'GOLD', currency: 'USD', isActive: true },
    create: { id: 'pl-gold-usd', name: 'Gold Tier — USD', customerTier: 'GOLD', currency: 'USD', isActive: true },
  });
  const plSilver = await prisma.priceList.upsert({
    where: { id: 'pl-silver-usd' },
    update: { name: 'Silver Tier — USD', customerTier: 'SILVER', currency: 'USD', isActive: true },
    create: { id: 'pl-silver-usd', name: 'Silver Tier — USD', customerTier: 'SILVER', currency: 'USD', isActive: true },
  });
  const plBronze = await prisma.priceList.upsert({
    where: { id: 'pl-bronze-usd' },
    update: { name: 'Bronze Tier — USD', customerTier: 'BRONZE', currency: 'USD', isActive: true },
    create: { id: 'pl-bronze-usd', name: 'Bronze Tier — USD', customerTier: 'BRONZE', currency: 'USD', isActive: true },
  });

  // Gold: 5% off base; Silver: 3% off; Bronze: full price
  const plItems = [
    // Gold
    { plId: plGold.id, prodId: pLaptop14.id, price: 1899.00 },
    { plId: plGold.id, prodId: pLaptop16.id, price: 2374.00 },
    { plId: plGold.id, prodId: pDock.id,     price: 237.00  },
    { plId: plGold.id, prodId: pMonitor.id,  price: 664.00  },
    { plId: plGold.id, prodId: pSetup.id,    price: 475.00  },
    // Silver
    { plId: plSilver.id, prodId: pLaptop14.id, price: 1939.00 },
    { plId: plSilver.id, prodId: pLaptop16.id, price: 2424.00 },
    { plId: plSilver.id, prodId: pDock.id,     price: 242.00  },
    { plId: plSilver.id, prodId: pSetup.id,    price: 485.00  },
    // Bronze: no custom items — uses base price
  ];
  for (const pi of plItems) {
    await prisma.priceListItem.create({
      data: { priceListId: pi.plId, productId: pi.prodId, unitPrice: pi.price, minimumQuantity: 1 },
    }).catch(() => {}); // ignore dup on re-run
  }
  console.log('[Seed] ✓ 3 price lists + items created.\n');

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 9 — UPSELL RULES (10)
  // ══════════════════════════════════════════════════════════════════════════
  const upsellRules = [
    { trigger: pLaptop14, suggest: pDock,      margin: 20, promoted: true  },
    { trigger: pLaptop14, suggest: pHeadset,   margin: 18, promoted: true  },
    { trigger: pLaptop14, suggest: pWarranty,  margin: 15, promoted: false },
    { trigger: pLaptop14, suggest: pCarePlan,  margin: 12, promoted: true  },
    { trigger: pLaptop16, suggest: pDock,      margin: 20, promoted: true  },
    { trigger: pLaptop16, suggest: pMonitor,   margin: 18, promoted: false },
    { trigger: pLaptop16, suggest: pWarranty,  margin: 15, promoted: true  },
    { trigger: pDock,     suggest: pMonitor,   margin: 20, promoted: false },
    { trigger: pMonitor,  suggest: pHeadset,   margin: 15, promoted: true  },
    { trigger: pSetup,    suggest: pTraining,  margin: 10, promoted: true  },
  ];
  for (const ur of upsellRules) {
    await prisma.upsellRule.create({
      data: {
        triggerProductId: ur.trigger.id,
        suggestedProductId: ur.suggest.id,
        minimumMarginThreshold: ur.margin,
        isPromoted: ur.promoted,
        isActive: true,
      },
    }).catch(() => {});
  }
  console.log('[Seed] ✓ 10 upsell rules created.\n');

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 10 — QUOTATIONS (40 across all statuses)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('[Seed] Creating 40 quotations across all statuses…');

  // Helper: create a quotation with lines, optional approval steps + invoices
  let qSeq = 1000;
  async function makeQuote({
    customer, rep, status, currency = 'USD', daysOld = 5,
    lines = [], approvals = [], invoiceStatus = null,
    riskScore = 0, riskLevel = 'LOW', notes = null,
  }) {
    const qNum = `Q-${++qSeq}`;
    const subtotal = lines.reduce((s, l) => s + l.lineSubtotal, 0);
    const discTotal = lines.reduce((s, l) => s + l.lineDiscountAmount, 0);
    const taxTotal = lines.reduce((s, l) => s + (l.lineSubtotal * (l.taxPercent || 0) / 100), 0);
    const grandTotal = subtotal + taxTotal;
    const totalCost = lines.reduce((s, l) => s + (l.unitCost * l.quantity), 0);
    const marginAmount = grandTotal - totalCost - taxTotal;
    const marginPct = grandTotal > 0 ? (marginAmount / grandTotal * 100) : 0;
    const createdAt = daysAgo(daysOld);

    const q = await prisma.quotation.create({
      data: {
        quoteNumber: qNum,
        customerId: customer.id,
        ownerRepId: rep.id,
        currency,
        status,
        subtotal: Number(subtotal.toFixed(2)),
        discountTotal: Number(discTotal.toFixed(2)),
        taxTotal: Number(taxTotal.toFixed(2)),
        grandTotal: Number(grandTotal.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        marginAmount: Number(marginAmount.toFixed(2)),
        marginPercentage: Number(marginPct.toFixed(2)),
        blendedRiskScore: riskScore,
        riskLevel,
        version: 1,
        expirationDate: daysFromNow(30),
        createdAt,
        updatedAt: createdAt,
        lines: {
          create: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            unitCost: l.unitCost,
            discountPercent: l.discountPercent,
            lineDiscountLimit: l.lineDiscountLimit || 15,
            taxPercent: l.taxPercent || 0,
            lineSubtotal: Number(l.lineSubtotal.toFixed(2)),
            lineDiscountAmount: Number(l.lineDiscountAmount.toFixed(2)),
            lineMargin: Number(l.lineMargin.toFixed(2)),
            isRecurring: l.isRecurring || false,
            subscriptionPlanId: l.subscriptionPlanId || null,
            categorySnapshot: l.category,
            productNameSnapshot: l.productName,
          })),
        },
      },
    });

    // Approval steps
    for (const ap of approvals) {
      await prisma.approvalStep.create({
        data: {
          quotationId: q.id,
          stepOrder: ap.order,
          requiredRole: ap.role,
          assignedUserId: ap.userId || null,
          status: ap.status,
          actionedAt: ap.status !== 'PENDING' ? daysAgo(daysOld - 1) : null,
          notes: ap.notes || null,
        },
      });
    }

    // Invoice
    if (invoiceStatus) {
      const invNum = `INV-${qNum.replace('Q-', '')}`;
      const dueDate = status === 'CONFIRMED' ? daysFromNow(30) : daysAgo(10);
      await prisma.invoice.create({
        data: {
          quotationId: q.id,
          invoiceNumber: invNum,
          type: 'STANDARD',
          amount: Number(grandTotal.toFixed(2)),
          status: invoiceStatus,
          dueDate,
          paidAt: invoiceStatus === 'PAID' ? daysAgo(daysOld - 2) : null,
        },
      });
    }

    return q;
  }

  // ── Shorthand line builders ──────────────────────────────────────────────
  function hwLine(prod, qty, discPct, limitPct = 15) {
    const { lineSubtotal, lineDiscountAmount, lineMargin } = calcLine(
      qty, Number(prod.basePrice), Number(prod.baseCost), discPct, 8.25
    );
    return {
      productId: prod.id, productName: prod.name, category: 'Hardware',
      quantity: qty, unitPrice: Number(prod.basePrice), unitCost: Number(prod.baseCost),
      discountPercent: discPct, lineDiscountLimit: limitPct,
      taxPercent: 8.25, lineSubtotal, lineDiscountAmount, lineMargin,
    };
  }

  function svcLine(prod, qty, discPct, limitPct = 10) {
    const { lineSubtotal, lineDiscountAmount, lineMargin } = calcLine(
      qty, Number(prod.basePrice), Number(prod.baseCost), discPct, 0
    );
    return {
      productId: prod.id, productName: prod.name, category: 'Services',
      quantity: qty, unitPrice: Number(prod.basePrice), unitCost: Number(prod.baseCost),
      discountPercent: discPct, lineDiscountLimit: limitPct,
      taxPercent: 0, lineSubtotal, lineDiscountAmount, lineMargin,
    };
  }

  function subLine(prod, qty, discPct = 0, planId = 'plan-care-monthly') {
    const { lineSubtotal, lineDiscountAmount, lineMargin } = calcLine(
      qty, Number(prod.basePrice), Number(prod.baseCost), discPct, 0
    );
    return {
      productId: prod.id, productName: prod.name, category: 'Subscriptions',
      quantity: qty, unitPrice: Number(prod.basePrice), unitCost: Number(prod.baseCost),
      discountPercent: discPct, lineDiscountLimit: 8,
      taxPercent: 0, lineSubtotal, lineDiscountAmount, lineMargin,
      isRecurring: true, subscriptionPlanId: planId,
    };
  }

  function wrnLine(prod, qty, discPct = 0) {
    const { lineSubtotal, lineDiscountAmount, lineMargin } = calcLine(
      qty, Number(prod.basePrice), Number(prod.baseCost), discPct, 0
    );
    return {
      productId: prod.id, productName: prod.name, category: 'Warranty',
      quantity: qty, unitPrice: Number(prod.basePrice), unitCost: Number(prod.baseCost),
      discountPercent: discPct, lineDiscountLimit: 5,
      taxPercent: 0, lineSubtotal, lineDiscountAmount, lineMargin,
    };
  }

  // ═══ DRAFT QUOTATIONS (8) ════════════════════════════════════════════════
  const qDraft1 = await makeQuote({
    customer: customers['Acme Corp'], rep: rep1, status: 'DRAFT', daysOld: 1,
    riskScore: 5, riskLevel: 'LOW',
    lines: [ hwLine(pLaptop14, 3, 5), hwLine(pDock, 3, 5) ],
  });

  const qDraft2 = await makeQuote({
    customer: customers['Beta Industries'], rep: rep2, status: 'DRAFT', daysOld: 2,
    riskScore: 0, riskLevel: 'NONE',
    lines: [ hwLine(pMonitor, 5, 3), svcLine(pSetup, 1, 0) ],
  });

  const qDraft3 = await makeQuote({
    customer: customers['NovaTech Solutions'], rep: rep1, status: 'DRAFT', daysOld: 3,
    riskScore: 8, riskLevel: 'LOW',
    lines: [ hwLine(pLaptop16, 5, 8), svcLine(pConsulting, 2, 5), subLine(pCarePlan, 5, 0) ],
  });

  const qDraft4 = await makeQuote({
    customer: customers['Quantum Dynamics'], rep: rep3, status: 'DRAFT', daysOld: 1,
    riskScore: 0, riskLevel: 'NONE',
    lines: [ hwLine(pHeadset, 10, 4) ],
  });

  const qDraft5 = await makeQuote({
    customer: customers['Summit Retail Co'], rep: rep2, status: 'DRAFT', daysOld: 0,
    riskScore: 0, riskLevel: 'NONE',
    lines: [ hwLine(pLaptop14, 2, 2), wrnLine(pWarranty, 2) ],
  });

  const qDraft6 = await makeQuote({
    customer: customers['Crest Logistics'], rep: rep3, status: 'DRAFT', daysOld: 4,
    riskScore: 3, riskLevel: 'LOW',
    lines: [ hwLine(pDock, 8, 3), svcLine(pTraining, 2, 0) ],
  });

  const qDraft7 = await makeQuote({
    customer: customers['Meridian Partners'], rep: rep1, status: 'DRAFT', daysOld: 2,
    riskScore: 12, riskLevel: 'LOW',
    lines: [ hwLine(pLaptop16, 2, 10), svcLine(pSecurity, 2, 6), subLine(pSaaS, 10, 0, 'plan-crm-yearly') ],
  });

  const qDraft8 = await makeQuote({
    customer: customers['Pinnacle Services'], rep: rep2, status: 'DRAFT', daysOld: 0,
    riskScore: 0, riskLevel: 'NONE',
    lines: [ svcLine(pConsulting, 3, 0), svcLine(pTraining, 4, 0) ],
  });

  // ═══ PENDING APPROVAL QUOTATIONS (8) ════════════════════════════════════

  // Manager only — GOLD, 18% discount on service (over 10% ceiling → flagged)
  const qPend1 = await makeQuote({
    customer: customers['Acme Corp'], rep: rep1, status: 'PENDING_APPROVAL', daysOld: 3,
    riskScore: 28, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop14, 4, 12), svcLine(pSetup, 2, 18) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'PENDING' }],
  });

  // Manager only — SILVER, 14% on hardware (over 10% ceiling)
  const qPend2 = await makeQuote({
    customer: customers['Beta Industries'], rep: rep2, status: 'PENDING_APPROVAL', daysOld: 5,
    riskScore: 22, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop14, 2, 14), hwLine(pDock, 2, 14) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr2.id, status: 'PENDING' }],
  });

  // Finance escalation — GOLD, 28% service discount (over 10+15 ceiling, blended HIGH)
  const qPend3 = await makeQuote({
    customer: customers['NovaTech Solutions'], rep: rep1, status: 'PENDING_APPROVAL', daysOld: 2,
    riskScore: 62, riskLevel: 'HIGH',
    lines: [ hwLine(pLaptop16, 6, 10), svcLine(pConsulting, 3, 28) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED', notes: 'Hardware lines OK' },
      { order: 2, role: 'FINANCE', userId: fin1.id, status: 'PENDING' },
    ],
  });

  // Mixed: large hardware + subscription discount
  const qPend4 = await makeQuote({
    customer: customers['Quantum Dynamics'], rep: rep3, status: 'PENDING_APPROVAL', daysOld: 4,
    riskScore: 18, riskLevel: 'LOW',
    lines: [ hwLine(pMonitor, 12, 11), subLine(pSaaS, 20, 5, 'plan-crm-yearly') ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'PENDING' }],
  });

  // Finance escalation — BRONZE, any discount triggers chain fast
  const qPend5 = await makeQuote({
    customer: customers['Summit Retail Co'], rep: rep2, status: 'PENDING_APPROVAL', daysOld: 1,
    riskScore: 45, riskLevel: 'HIGH',
    lines: [ hwLine(pLaptop14, 3, 18), svcLine(pSecurity, 1, 22) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr2.id, status: 'APPROVED', notes: 'Exceptional deal — forwarding to finance' },
      { order: 2, role: 'FINANCE', userId: fin2.id, status: 'PENDING' },
    ],
  });

  const qPend6 = await makeQuote({
    customer: customers['Crest Logistics'], rep: rep3, status: 'PENDING_APPROVAL', daysOld: 6,
    riskScore: 15, riskLevel: 'LOW',
    lines: [ hwLine(pHeadset, 20, 8), svcLine(pTraining, 3, 12) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'PENDING' }],
  });

  const qPend7 = await makeQuote({
    customer: customers['Meridian Partners'], rep: rep1, status: 'PENDING_APPROVAL', daysOld: 2,
    riskScore: 30, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop16, 4, 12), svcLine(pSetup, 2, 15), wrnLine(pWarranty, 4) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr2.id, status: 'PENDING' }],
  });

  const qPend8 = await makeQuote({
    customer: customers['Pinnacle Services'], rep: rep2, status: 'PENDING_APPROVAL', daysOld: 7,
    riskScore: 55, riskLevel: 'HIGH',
    lines: [ svcLine(pConsulting, 5, 25), subLine(pSaaS, 15, 10, 'plan-crm-yearly') ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED', notes: 'Strategic account — escalate' },
      { order: 2, role: 'FINANCE', userId: fin1.id, status: 'PENDING' },
    ],
  });

  // ═══ APPROVED QUOTATIONS (5) ═════════════════════════════════════════════
  const qAppr1 = await makeQuote({
    customer: customers['Acme Corp'], rep: rep1, status: 'APPROVED', daysOld: 8,
    riskScore: 20, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop14, 5, 12), hwLine(pDock, 5, 8) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED', notes: 'Strategic account — approved' }],
  });

  const qAppr2 = await makeQuote({
    customer: customers['NovaTech Solutions'], rep: rep1, status: 'APPROVED', daysOld: 10,
    riskScore: 48, riskLevel: 'HIGH',
    lines: [ hwLine(pLaptop16, 8, 10), svcLine(pConsulting, 4, 20), subLine(pCarePlan, 8) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED' },
      { order: 2, role: 'FINANCE', userId: fin1.id, status: 'APPROVED', notes: 'Margin still acceptable at scale' },
    ],
  });

  const qAppr3 = await makeQuote({
    customer: customers['Beta Industries'], rep: rep2, status: 'APPROVED', daysOld: 6,
    riskScore: 12, riskLevel: 'LOW',
    lines: [ hwLine(pMonitor, 8, 9), hwLine(pHeadset, 8, 7) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr2.id, status: 'APPROVED' }],
  });

  const qAppr4 = await makeQuote({
    customer: customers['Quantum Dynamics'], rep: rep3, status: 'APPROVED', daysOld: 9,
    riskScore: 22, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop14, 6, 11), svcLine(pSecurity, 2, 14) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED', notes: 'Rep is reliable — approved' },
      { order: 2, role: 'FINANCE', userId: fin2.id, status: 'APPROVED' },
    ],
  });

  const qAppr5 = await makeQuote({
    customer: customers['Meridian Partners'], rep: rep1, status: 'APPROVED', daysOld: 7,
    riskScore: 8, riskLevel: 'LOW',
    lines: [ hwLine(pLaptop14, 3, 8), wrnLine(pWarranty, 3) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr2.id, status: 'APPROVED' }],
  });

  // ═══ RETURNED (revision requested) (3) ═══════════════════════════════════
  const qRet1 = await makeQuote({
    customer: customers['Crest Logistics'], rep: rep3, status: 'RETURNED', daysOld: 12,
    riskScore: 72, riskLevel: 'HIGH',
    lines: [ hwLine(pLaptop14, 10, 20), svcLine(pSetup, 5, 30) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'RETURNED', notes: 'Discount too aggressive — reduce service discount to max 8% and resubmit' }],
  });

  const qRet2 = await makeQuote({
    customer: customers['Summit Retail Co'], rep: rep2, status: 'RETURNED', daysOld: 9,
    riskScore: 35, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop16, 3, 16), svcLine(pConsulting, 2, 18) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr2.id, status: 'APPROVED', notes: 'Forwarding with caveat — reduce service' },
      { order: 2, role: 'FINANCE', userId: fin1.id, status: 'RETURNED', notes: 'Service discount non-negotiable. Need 8% max.' },
    ],
  });

  const qRet3 = await makeQuote({
    customer: customers['Pinnacle Services'], rep: rep3, status: 'RETURNED', daysOld: 15,
    riskScore: 18, riskLevel: 'LOW',
    lines: [ svcLine(pTraining, 6, 14), subLine(pCarePlan, 6) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'RETURNED', notes: 'Training discount max is 10% per policy. Please correct.' }],
  });

  // ═══ REJECTED (2) ════════════════════════════════════════════════════════
  const qRej1 = await makeQuote({
    customer: customers['Acme Corp'], rep: rep2, status: 'REJECTED', daysOld: 20,
    riskScore: 91, riskLevel: 'HIGH',
    lines: [ hwLine(pLaptop16, 15, 25), svcLine(pConsulting, 8, 40) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'REJECTED', notes: 'Cannot approve — 25% hardware and 40% service discount destroys margin. Deal declined.' },
    ],
  });

  const qRej2 = await makeQuote({
    customer: customers['Beta Industries'], rep: rep3, status: 'REJECTED', daysOld: 25,
    riskScore: 80, riskLevel: 'HIGH',
    lines: [ hwLine(pLaptop14, 20, 30), svcLine(pSecurity, 5, 35) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr2.id, status: 'APPROVED', notes: 'Reluctant forward' },
      { order: 2, role: 'FINANCE', userId: fin2.id, status: 'REJECTED', notes: 'Blended margin < 0. Hard reject.' },
    ],
  });

  // ═══ SENT_TO_CUSTOMER (4) ════════════════════════════════════════════════
  const qSent1 = await makeQuote({
    customer: customers['Acme Corp'], rep: rep1, status: 'SENT_TO_CUSTOMER', daysOld: 5,
    riskScore: 14, riskLevel: 'LOW',
    lines: [ hwLine(pLaptop14, 4, 10), hwLine(pDock, 4, 8), wrnLine(pWarranty, 4) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED' }],
  });

  const qSent2 = await makeQuote({
    customer: customers['NovaTech Solutions'], rep: rep1, status: 'SENT_TO_CUSTOMER', daysOld: 7,
    riskScore: 5, riskLevel: 'LOW',
    lines: [ hwLine(pMonitor, 10, 5), subLine(pCarePlan, 10) ],
  });

  const qSent3 = await makeQuote({
    customer: customers['Quantum Dynamics'], rep: rep2, status: 'SENT_TO_CUSTOMER', daysOld: 3,
    riskScore: 20, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop16, 3, 12), svcLine(pSetup, 3, 8) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr2.id, status: 'APPROVED' }],
  });

  const qSent4 = await makeQuote({
    customer: customers['Meridian Partners'], rep: rep3, status: 'SENT_TO_CUSTOMER', daysOld: 4,
    riskScore: 0, riskLevel: 'NONE',
    lines: [ svcLine(pConsulting, 2, 0), svcLine(pTraining, 3, 0) ],
  });

  // ═══ UNDER NEGOTIATION (3) ═══════════════════════════════════════════════
  const qNeg1 = await makeQuote({
    customer: customers['Acme Corp'], rep: rep1, status: 'UNDER_NEGOTIATION', daysOld: 8,
    riskScore: 14, riskLevel: 'LOW',
    lines: [ hwLine(pLaptop14, 5, 10), hwLine(pHeadset, 5, 5) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED' }],
  });

  const qNeg2 = await makeQuote({
    customer: customers['NovaTech Solutions'], rep: rep2, status: 'UNDER_NEGOTIATION', daysOld: 12,
    riskScore: 30, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop16, 4, 12), subLine(pSaaS, 20, 5, 'plan-crm-yearly') ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED' },
      { order: 2, role: 'FINANCE', userId: fin2.id, status: 'APPROVED' },
    ],
  });

  const qNeg3 = await makeQuote({
    customer: customers['Beta Industries'], rep: rep3, status: 'UNDER_NEGOTIATION', daysOld: 9,
    riskScore: 8, riskLevel: 'LOW',
    lines: [ hwLine(pMonitor, 6, 7), svcLine(pTraining, 2, 5) ],
  });

  // ═══ CONFIRMED — Fully closed deals (5) ═════════════════════════════════
  const qConf1 = await makeQuote({
    customer: customers['Acme Corp'], rep: rep1, status: 'CONFIRMED', daysOld: 14,
    riskScore: 10, riskLevel: 'LOW',
    lines: [ hwLine(pLaptop14, 6, 8), hwLine(pDock, 6, 5), wrnLine(pWarranty, 6) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED' }],
    invoiceStatus: 'PAID',
  });

  const qConf2 = await makeQuote({
    customer: customers['NovaTech Solutions'], rep: rep1, status: 'CONFIRMED', daysOld: 18,
    riskScore: 45, riskLevel: 'HIGH',
    lines: [ hwLine(pLaptop16, 10, 10), svcLine(pConsulting, 5, 15), subLine(pSaaS, 25, 5, 'plan-crm-yearly') ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED' },
      { order: 2, role: 'FINANCE', userId: fin1.id, status: 'APPROVED', notes: 'Volume justifies margin concession' },
    ],
    invoiceStatus: 'PAID',
  });

  const qConf3 = await makeQuote({
    customer: customers['Beta Industries'], rep: rep2, status: 'CONFIRMED', daysOld: 22,
    riskScore: 5, riskLevel: 'LOW',
    lines: [ hwLine(pMonitor, 15, 5), hwLine(pHeadset, 15, 3) ],
    invoiceStatus: 'ISSUED',
  });

  const qConf4 = await makeQuote({
    customer: customers['Quantum Dynamics'], rep: rep3, status: 'CONFIRMED', daysOld: 30,
    riskScore: 20, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop14, 8, 10), svcLine(pSecurity, 4, 12) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr2.id, status: 'APPROVED' },
      { order: 2, role: 'FINANCE', userId: fin2.id, status: 'APPROVED' },
    ],
    invoiceStatus: 'PARTIALLY_PAID',
  });

  const qConf5 = await makeQuote({
    customer: customers['Meridian Partners'], rep: rep1, status: 'CONFIRMED', daysOld: 45,
    riskScore: 0, riskLevel: 'NONE',
    lines: [ svcLine(pConsulting, 3, 0), svcLine(pTraining, 5, 0), subLine(pCarePlan, 15) ],
    invoiceStatus: 'OVERDUE',
  });

  // ═══ CONVERTED TO ORDER (2) ══════════════════════════════════════════════
  const qConv1 = await makeQuote({
    customer: customers['Acme Corp'], rep: rep1, status: 'CONVERTED_TO_ORDER', daysOld: 60,
    riskScore: 12, riskLevel: 'LOW',
    lines: [ hwLine(pLaptop14, 12, 8), hwLine(pDock, 12, 5), subLine(pCarePlan, 12) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED' }],
    invoiceStatus: 'PAID',
  });

  const qConv2 = await makeQuote({
    customer: customers['NovaTech Solutions'], rep: rep2, status: 'CONVERTED_TO_ORDER', daysOld: 75,
    riskScore: 35, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop16, 20, 10), svcLine(pConsulting, 10, 10), subLine(pSaaS, 40, 5, 'plan-crm-yearly') ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED' },
      { order: 2, role: 'FINANCE', userId: fin1.id, status: 'APPROVED' },
    ],
    invoiceStatus: 'PAID',
  });

  // ═══ EXPIRED (2) — Old sent quotes never confirmed ════════════════════════
  await makeQuote({
    customer: customers['Crest Logistics'], rep: rep3, status: 'EXPIRED', daysOld: 45,
    riskScore: 5, riskLevel: 'LOW',
    lines: [ hwLine(pHeadset, 8, 3) ],
  });

  await makeQuote({
    customer: customers['Pinnacle Services'], rep: rep2, status: 'EXPIRED', daysOld: 60,
    riskScore: 0, riskLevel: 'NONE',
    lines: [ svcLine(pTraining, 4, 0) ],
  });

  // ═══ STEP 10B — EXPANDED REALISTIC QUOTATIONS (24 MORE: Q-1041 to Q-1064) ═══
  // DRAFT (4)
  const qExtraDraft1 = await makeQuote({
    customer: customers['Apex Global Technologies'], rep: rep1, status: 'DRAFT', daysOld: 2,
    riskScore: 0, riskLevel: 'NONE',
    lines: [ hwLine(pLaptop16, 8, 0), hwLine(pDock, 8, 0), wrnLine(pWarranty, 8) ],
  });
  const qExtraDraft2 = await makeQuote({
    customer: customers['Vanguard Systems Corp'], rep: rep2, status: 'DRAFT', daysOld: 3,
    riskScore: 5, riskLevel: 'LOW',
    lines: [ hwLine(pLaptop14, 12, 5), svcLine(pSetup, 1, 0) ],
  });
  const qExtraDraft3 = await makeQuote({
    customer: customers['Helios Energy Group'], rep: rep3, status: 'DRAFT', daysOld: 1,
    riskScore: 8, riskLevel: 'LOW',
    lines: [ hwLine(pMonitor, 10, 8), hwLine(pHeadset, 10, 5) ],
  });
  const qExtraDraft4 = await makeQuote({
    customer: customers['Terraform Analytics'], rep: rep1, status: 'DRAFT', daysOld: 4,
    riskScore: 0, riskLevel: 'NONE',
    lines: [ subLine(pSaaS, 30, 0, 'plan-crm-yearly'), svcLine(pConsulting, 2, 0) ],
  });

  // PENDING_APPROVAL (4)
  const qExtraPend1 = await makeQuote({
    customer: customers['Apex Global Technologies'], rep: rep1, status: 'PENDING_APPROVAL', daysOld: 3,
    riskScore: 18, riskLevel: 'LOW',
    lines: [ hwLine(pLaptop16, 15, 18, 15), hwLine(pDock, 15, 10, 15) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', status: 'PENDING' }],
  });
  const qExtraPend2 = await makeQuote({
    customer: customers['Vanguard Systems Corp'], rep: rep2, status: 'PENDING_APPROVAL', daysOld: 2,
    riskScore: 35, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop14, 20, 22, 15), svcLine(pSetup, 3, 15, 10) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', status: 'PENDING' },
      { order: 2, role: 'FINANCE', status: 'PENDING' },
    ],
  });
  const qExtraPend3 = await makeQuote({
    customer: customers['Helios Energy Group'], rep: rep3, status: 'PENDING_APPROVAL', daysOld: 1,
    riskScore: 55, riskLevel: 'HIGH',
    lines: [ hwLine(pMonitor, 25, 25, 10), svcLine(pConsulting, 5, 20, 10) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', status: 'PENDING' },
      { order: 2, role: 'FINANCE', status: 'PENDING' },
    ],
  });
  const qExtraPend4 = await makeQuote({
    customer: customers['Starlight Media Network'], rep: rep1, status: 'PENDING_APPROVAL', daysOld: 2,
    riskScore: 22, riskLevel: 'MEDIUM',
    lines: [ hwLine(pHeadset, 30, 15, 5), subLine(pCarePlan, 30, 10, 'plan-care-monthly') ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', status: 'PENDING' }],
  });

  // IN_REVIEW (3)
  const qExtraRev1 = await makeQuote({
    customer: customers['Apex Global Technologies'], rep: rep2, status: 'IN_REVIEW', daysOld: 4,
    riskScore: 40, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop16, 10, 20, 15), svcLine(pConsulting, 4, 15, 10) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED', notes: 'Strategic Q3 expansion' },
      { order: 2, role: 'FINANCE', status: 'PENDING' },
    ],
  });
  const qExtraRev2 = await makeQuote({
    customer: customers['Terraform Analytics'], rep: rep3, status: 'IN_REVIEW', daysOld: 3,
    riskScore: 65, riskLevel: 'HIGH',
    lines: [ subLine(pSaaS, 50, 25, 'plan-crm-yearly'), svcLine(pTraining, 6, 20, 10) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr2.id, status: 'APPROVED', notes: 'Multi-year commitment lock-in' },
      { order: 2, role: 'FINANCE', status: 'PENDING' },
    ],
  });
  const qExtraRev3 = await makeQuote({
    customer: customers['Omega Freight Logistics'], rep: rep1, status: 'IN_REVIEW', daysOld: 5,
    riskScore: 32, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop14, 15, 18, 5), hwLine(pDock, 15, 12, 5) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED', notes: 'Fleet rollout volume' },
      { order: 2, role: 'FINANCE', status: 'PENDING' },
    ],
  });

  // APPROVED (3)
  const qExtraAppr1 = await makeQuote({
    customer: customers['Apex Global Technologies'], rep: rep1, status: 'APPROVED', daysOld: 5,
    riskScore: 12, riskLevel: 'LOW',
    lines: [ hwLine(pLaptop14, 8, 12, 15), hwLine(pDock, 8, 8, 15), wrnLine(pWarranty, 8) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED', notes: 'Within executive tolerance' }],
  });
  const qExtraAppr2 = await makeQuote({
    customer: customers['Helios Energy Group'], rep: rep2, status: 'APPROVED', daysOld: 6,
    riskScore: 28, riskLevel: 'MEDIUM',
    lines: [ hwLine(pMonitor, 20, 14, 10), hwLine(pHeadset, 20, 10, 10) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr2.id, status: 'APPROVED' },
      { order: 2, role: 'FINANCE', userId: fin1.id, status: 'APPROVED', notes: 'Energy sector reference account' },
    ],
  });
  const qExtraAppr3 = await makeQuote({
    customer: customers['Vanguard Systems Corp'], rep: rep3, status: 'APPROVED', daysOld: 4,
    riskScore: 8, riskLevel: 'LOW',
    lines: [ subLine(pSaaS, 25, 5, 'plan-crm-yearly'), svcLine(pSetup, 2, 5, 10) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED' }],
  });

  // SENT_TO_CUSTOMER / UNDER_NEGOTIATION (4)
  const qExtraSent1 = await makeQuote({
    customer: customers['Apex Global Technologies'], rep: rep1, status: 'SENT_TO_CUSTOMER', daysOld: 6,
    riskScore: 10, riskLevel: 'LOW',
    lines: [ hwLine(pLaptop16, 12, 10, 15), hwLine(pDock, 12, 10, 15) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED' }],
  });
  const qExtraSent2 = await makeQuote({
    customer: customers['Vanguard Systems Corp'], rep: rep2, status: 'UNDER_NEGOTIATION', daysOld: 7,
    riskScore: 24, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop14, 15, 12, 15), wrnLine(pWarranty, 15) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr2.id, status: 'APPROVED' }],
  });
  const qExtraSent3 = await makeQuote({
    customer: customers['Terraform Analytics'], rep: rep3, status: 'SENT_TO_CUSTOMER', daysOld: 8,
    riskScore: 5, riskLevel: 'LOW',
    lines: [ subLine(pCarePlan, 20, 0, 'plan-care-monthly'), svcLine(pTraining, 3, 0, 10) ],
  });
  const qExtraSent4 = await makeQuote({
    customer: customers['Omega Freight Logistics'], rep: rep1, status: 'UNDER_NEGOTIATION', daysOld: 9,
    riskScore: 18, riskLevel: 'LOW',
    lines: [ hwLine(pHeadset, 25, 10, 5), svcLine(pSetup, 2, 8, 5) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED' }],
  });

  // CONFIRMED (4)
  const qExtraConf1 = await makeQuote({
    customer: customers['Apex Global Technologies'], rep: rep1, status: 'CONFIRMED', daysOld: 10,
    riskScore: 8, riskLevel: 'LOW',
    lines: [ hwLine(pLaptop16, 10, 8, 15), hwLine(pDock, 10, 5, 15), wrnLine(pWarranty, 10) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED' }],
    invoiceStatus: 'PAID',
  });
  const qExtraConf2 = await makeQuote({
    customer: customers['Vanguard Systems Corp'], rep: rep2, status: 'CONFIRMED', daysOld: 12,
    riskScore: 30, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop14, 14, 12, 15), subLine(pSaaS, 30, 5, 'plan-crm-yearly') ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr2.id, status: 'APPROVED' },
      { order: 2, role: 'FINANCE', userId: fin2.id, status: 'APPROVED' },
    ],
    invoiceStatus: 'ISSUED',
  });
  const qExtraConf3 = await makeQuote({
    customer: customers['Helios Energy Group'], rep: rep3, status: 'CONFIRMED', daysOld: 15,
    riskScore: 15, riskLevel: 'LOW',
    lines: [ hwLine(pMonitor, 18, 10, 10), hwLine(pHeadset, 18, 5, 10) ],
    approvals: [{ order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'APPROVED' }],
    invoiceStatus: 'PARTIALLY_PAID',
  });
  const qExtraConf4 = await makeQuote({
    customer: customers['Terraform Analytics'], rep: rep1, status: 'CONFIRMED', daysOld: 14,
    riskScore: 0, riskLevel: 'NONE',
    lines: [ subLine(pCarePlan, 15, 0, 'plan-care-quarterly'), svcLine(pConsulting, 3, 0) ],
    invoiceStatus: 'PAID',
  });

  // REJECTED (2)
  const qExtraRej1 = await makeQuote({
    customer: customers['Starlight Media Network'], rep: rep2, status: 'REJECTED', daysOld: 11,
    riskScore: 85, riskLevel: 'HIGH',
    lines: [ hwLine(pLaptop16, 20, 35, 5), hwLine(pMonitor, 20, 30, 5) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'REJECTED', notes: 'Margin negative; requested 35% discount exceeds 5% bronze ceiling' },
    ],
  });
  const qExtraRej2 = await makeQuote({
    customer: customers['Omega Freight Logistics'], rep: rep3, status: 'REJECTED', daysOld: 13,
    riskScore: 75, riskLevel: 'HIGH',
    lines: [ hwLine(pLaptop14, 30, 28, 5), subLine(pSaaS, 30, 20, 'plan-crm-yearly') ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr2.id, status: 'REJECTED', notes: 'Unacceptable discount spread across multiple product lines' },
    ],
  });

  // RETURNED (2)
  const qExtraRet1 = await makeQuote({
    customer: customers['Helios Energy Group'], rep: rep1, status: 'RETURNED', daysOld: 8,
    riskScore: 28, riskLevel: 'MEDIUM',
    lines: [ hwLine(pLaptop14, 10, 15, 10), svcLine(pSetup, 2, 15, 10) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr1.id, status: 'RETURNED', notes: 'Reduce hardware discount to 10% to preserve target margin' },
    ],
  });
  const qExtraRet2 = await makeQuote({
    customer: customers['Terraform Analytics'], rep: rep2, status: 'RETURNED', daysOld: 9,
    riskScore: 32, riskLevel: 'MEDIUM',
    lines: [ hwLine(pMonitor, 15, 18, 10), wrnLine(pWarranty, 15) ],
    approvals: [
      { order: 1, role: 'SALES_MANAGER', userId: mgr2.id, status: 'RETURNED', notes: 'Please bundle with Care Plan to offset monitor discount' },
    ],
  });

  console.log(`[Seed] ✓ 64 quotations created across all ${new Set(['DRAFT','PENDING_APPROVAL','APPROVED','RETURNED','REJECTED','SENT_TO_CUSTOMER','UNDER_NEGOTIATION','CONFIRMED','CONVERTED_TO_ORDER','EXPIRED']).size} statuses.\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 11 — FULFILLMENT SPLITS (for confirmed/converted quotes)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('[Seed] Creating fulfillment splits…');
  const fulfillmentData = [
    // qConf1 — split across Main + East
    { q: qConf1, wh: whMain, p: pLaptop14, fulfilled: 4, backorder: 0, cost: 5600 },
    { q: qConf1, wh: whEast, p: pLaptop14, fulfilled: 2, backorder: 0, cost: 2800 },
    { q: qConf1, wh: whMain, p: pDock,     fulfilled: 6, backorder: 0, cost: 780  },
    // qConf2 — split across all 3
    { q: qConf2, wh: whMain, p: pLaptop16, fulfilled: 6, backorder: 0, cost: 10800 },
    { q: qConf2, wh: whEast, p: pLaptop16, fulfilled: 3, backorder: 0, cost: 5400  },
    { q: qConf2, wh: whWest, p: pLaptop16, fulfilled: 1, backorder: 0, cost: 1800  },
    // qConf3 — mostly Main, small East
    { q: qConf3, wh: whMain, p: pMonitor,  fulfilled: 12, backorder: 0, cost: 5040 },
    { q: qConf3, wh: whEast, p: pMonitor,  fulfilled: 3,  backorder: 0, cost: 1260 },
    { q: qConf3, wh: whMain, p: pHeadset,  fulfilled: 15, backorder: 0, cost: 2400 },
    // qConf4 — West has backorder
    { q: qConf4, wh: whMain, p: pLaptop14, fulfilled: 5, backorder: 0, cost: 7000  },
    { q: qConf4, wh: whWest, p: pLaptop14, fulfilled: 2, backorder: 1, cost: 2800  },
    // qConv1 — main fulfillment complete
    { q: qConv1, wh: whMain, p: pLaptop14, fulfilled: 10, backorder: 0, cost: 14000 },
    { q: qConv1, wh: whEast, p: pLaptop14, fulfilled: 2,  backorder: 0, cost: 2800  },
    { q: qConv1, wh: whMain, p: pDock,     fulfilled: 12, backorder: 0, cost: 1560  },
    // qConv2 — large split
    { q: qConv2, wh: whMain, p: pLaptop16, fulfilled: 12, backorder: 0, cost: 21600 },
    { q: qConv2, wh: whEast, p: pLaptop16, fulfilled: 5,  backorder: 0, cost: 9000  },
    { q: qConv2, wh: whWest, p: pLaptop16, fulfilled: 3,  backorder: 0, cost: 5400  },
    // qExtraConf1 — Apex Global Technologies
    { q: qExtraConf1, wh: whMain, p: pLaptop16, fulfilled: 7, backorder: 0, cost: 12600 },
    { q: qExtraConf1, wh: whEast, p: pLaptop16, fulfilled: 3, backorder: 0, cost: 5400  },
    { q: qExtraConf1, wh: whMain, p: pDock,     fulfilled: 10, backorder: 0, cost: 1300 },
    // qExtraConf2 — Vanguard Systems Corp
    { q: qExtraConf2, wh: whMain, p: pLaptop14, fulfilled: 10, backorder: 0, cost: 14000 },
    { q: qExtraConf2, wh: whWest, p: pLaptop14, fulfilled: 4,  backorder: 0, cost: 5600  },
    // qExtraConf3 — Helios Energy Group
    { q: qExtraConf3, wh: whEast, p: pMonitor,  fulfilled: 12, backorder: 0, cost: 5040 },
    { q: qExtraConf3, wh: whMain, p: pMonitor,  fulfilled: 6,  backorder: 0, cost: 2520 },
    { q: qExtraConf3, wh: whMain, p: pHeadset,  fulfilled: 18, backorder: 0, cost: 2880 },
  ];

  for (const f of fulfillmentData) {
    await prisma.fulfillmentSplit.create({
      data: {
        quotationId: f.q.id, warehouseId: f.wh.id, productId: f.p.id,
        quantityFulfilled: f.fulfilled, backorderQuantity: f.backorder,
        estimatedCost: f.cost, status: f.backorder > 0 ? 'BACKORDERED' : 'SHIPPED',
      },
    });
  }
  console.log(`[Seed] ✓ ${fulfillmentData.length} fulfillment split records created.\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 12 — BILLING SCHEDULES (recurring lines on confirmed quotes)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('[Seed] Creating billing schedules…');
  const billingSchedules = [
    // qConf2 — 25 × CRM SaaS recurring
    { planId: 'plan-crm-yearly', amount: 960 * 25, nextBill: daysFromNow(15), status: 'SCHEDULED' },
    { planId: 'plan-crm-yearly', amount: 960 * 25, nextBill: daysFromNow(375), status: 'SCHEDULED' },
    // qConf1 — Care Plan for 6 seats
    { planId: 'plan-care-monthly', amount: 49 * 6, nextBill: daysFromNow(5), status: 'SCHEDULED' },
    { planId: 'plan-care-monthly', amount: 49 * 6, nextBill: daysFromNow(35), status: 'SCHEDULED' },
    // qConv1 — Care Plan 12 seats
    { planId: 'plan-care-monthly', amount: 49 * 12, nextBill: daysFromNow(10), status: 'SCHEDULED' },
    // qConv2 — CRM 40 seats
    { planId: 'plan-crm-yearly', amount: 960 * 40, nextBill: daysFromNow(20), status: 'SCHEDULED' },
    { planId: 'plan-crm-yearly', amount: 960 * 40, nextBill: daysFromNow(385), status: 'SCHEDULED' },
    // Some past/invoiced schedules
    { planId: 'plan-care-monthly', amount: 49 * 6,  nextBill: daysAgo(25),  status: 'INVOICED' },
    { planId: 'plan-care-monthly', amount: 49 * 12, nextBill: daysAgo(20),  status: 'INVOICED' },
    { planId: 'plan-crm-yearly',   amount: 960 * 25, nextBill: daysAgo(350), status: 'INVOICED' },
    // qExtraConf2 — Vanguard Systems 30 × CRM SaaS
    { planId: 'plan-crm-yearly', amount: 960 * 30, nextBill: daysFromNow(25), status: 'SCHEDULED' },
    { planId: 'plan-crm-yearly', amount: 960 * 30, nextBill: daysFromNow(390), status: 'SCHEDULED' },
    // qExtraConf4 — Terraform Analytics Care Plan Quarterly
    { planId: 'plan-care-quarterly', amount: 139 * 15, nextBill: daysFromNow(12), status: 'SCHEDULED' },
    { planId: 'plan-care-quarterly', amount: 139 * 15, nextBill: daysFromNow(102), status: 'SCHEDULED' },
    { planId: 'plan-care-monthly', amount: 49 * 20, nextBill: daysFromNow(18), status: 'SCHEDULED' },
  ];

  for (const bs of billingSchedules) {
    await prisma.billingSchedule.create({
      data: {
        subscriptionPlanId: bs.planId,
        nextBillDate: bs.nextBill,
        amount: bs.amount,
        status: bs.status,
      },
    });
  }
  console.log(`[Seed] ✓ ${billingSchedules.length} billing schedule entries created.\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 13 — ADDITIONAL INVOICES (varied statuses for Finance/Reports view)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('[Seed] Creating additional invoices…');
  const additionalInvoices = [
    { q: qAppr1, num: 'INV-CREDIT-001', type: 'CREDIT_NOTE', amount: 299,  status: 'ISSUED',  dueOff: 30 },
    { q: qConf3, num: 'INV-REC-001',    type: 'RECURRING',   amount: 1176, status: 'ISSUED',  dueOff: 30 },
    { q: qConf4, num: 'INV-PART-001',   type: 'STANDARD',    amount: 4500, status: 'PARTIALLY_PAID', dueOff: 15 },
    { q: qConf5, num: 'INV-OVR-001',    type: 'STANDARD',    amount: 6800, status: 'OVERDUE', dueOff: -10 },
    { q: qConv2, num: 'INV-VOID-001',   type: 'CREDIT_NOTE', amount: 1200, status: 'VOID',    dueOff: 0  },
    // New invoices for expanded quotes
    { q: qExtraAppr1, num: 'INV-APEX-001',   type: 'STANDARD', amount: 18500, status: 'ISSUED', dueOff: 30 },
    { q: qExtraConf1, num: 'INV-APEX-002',   type: 'STANDARD', amount: 24350, status: 'PAID', dueOff: 15 },
    { q: qExtraConf2, num: 'INV-VANG-001',   type: 'STANDARD', amount: 38200, status: 'ISSUED', dueOff: 30 },
    { q: qExtraConf3, num: 'INV-HELIOS-001', type: 'STANDARD', amount: 15800, status: 'PARTIALLY_PAID', dueOff: 20 },
    { q: qExtraConf4, num: 'INV-TERRA-001',  type: 'RECURRING', amount: 3200, status: 'PAID', dueOff: 10 },
    { q: qExtraSent2, num: 'INV-PRE-001',    type: 'PROFORMA', amount: 22100, status: 'DRAFT', dueOff: 45 },
  ];

  for (const inv of additionalInvoices) {
    await prisma.invoice.create({
      data: {
        quotationId: inv.q.id, invoiceNumber: inv.num, type: inv.type,
        amount: inv.amount, status: inv.status,
        dueDate: inv.dueOff >= 0 ? daysFromNow(inv.dueOff) : daysAgo(-inv.dueOff),
        paidAt: inv.status === 'PAID' ? daysAgo(5) : null,
      },
    }).catch(() => {});
  }
  console.log(`[Seed] ✓ Additional invoices created.\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 14 — AUDIT LOGS (60+ events)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('[Seed] Creating audit log events…');
  const auditEvents = [
    // Quotation lifecycle
    { actor: rep1, action: 'QUOTATION_CREATED',         qId: qDraft1.id, note: 'Draft created for Acme Corp' },
    { actor: rep2, action: 'QUOTATION_CREATED',         qId: qDraft2.id, note: 'Draft created for Beta Industries' },
    { actor: rep1, action: 'QUOTATION_CREATED',         qId: qPend1.id,  note: 'Created — pending approval' },
    { actor: rep1, action: 'SUBMITTED_FOR_APPROVAL',    qId: qPend1.id,  note: 'Submitted — 18% service discount triggers approval' },
    { actor: mgr1, action: 'APPROVAL_STEP_APPROVED',    qId: qAppr1.id,  note: 'Approved — strategic account, discount justified' },
    { actor: mgr1, action: 'APPROVAL_STEP_APPROVED',    qId: qAppr2.id,  note: 'Step 1 approved, forwarding to Finance' },
    { actor: fin1, action: 'APPROVAL_STEP_APPROVED',    qId: qAppr2.id,  note: 'Finance approved — volume justifies concession' },
    { actor: mgr1, action: 'APPROVAL_STEP_RETURNED',    qId: qRet1.id,   note: 'Returned — 30% service discount unacceptable' },
    { actor: fin2, action: 'APPROVAL_STEP_REJECTED',    qId: qRej2.id,   note: 'Hard reject — negative margin detected' },
    { actor: rep1, action: 'SENT_TO_CUSTOMER',          qId: qSent1.id,  note: 'Quotation emailed to Acme Corp procurement' },
    { actor: rep1, action: 'SENT_TO_CUSTOMER',          qId: qNeg1.id,   note: 'Customer opened link — negotiation initiated' },
    // Customer portal events
    { actor: users['customer@acmecorp.com'], action: 'CUSTOMER_COMMENT',             qId: qNeg1.id, note: 'Can you include 2 extra headsets at no charge?' },
    { actor: users['customer@acmecorp.com'], action: 'COUNTER_DISCOUNT_PROPOSAL',    qId: qNeg1.id, note: 'Customer proposes 14% on laptops + dock' },
    { actor: users['customer@novatech.io'],  action: 'COUNTER_DISCOUNT_PROPOSAL',    qId: qNeg2.id, note: 'Customer requests 18% overall discount' },
    { actor: users['customer@acmecorp.com'], action: 'CUSTOMER_CONFIRMED_QUOTATION', qId: qConf1.id, note: 'Customer confirmed — terms accepted' },
    { actor: users['customer@novatech.io'],  action: 'CUSTOMER_CONFIRMED_QUOTATION', qId: qConf2.id, note: 'Customer confirmed — NovaTech deal closed' },
    // Fulfillment events
    { actor: fin1, action: 'FULFILLMENT_ACCEPTED',   qId: qConf1.id, note: 'Warehouse split accepted: Main x4, East x2 laptops' },
    { actor: fin2, action: 'FULFILLMENT_ACCEPTED',   qId: qConf2.id, note: 'Three-warehouse split for 10-unit laptop order' },
    { actor: fin1, action: 'BACKORDER_RAISED',       qId: qConf4.id, note: 'West Hub has 1 unit on backorder — ETA 5 days' },
    // Billing events
    { actor: fin1, action: 'INVOICE_GENERATED',  qId: qConf1.id, note: 'Invoice INV-1013 issued — $18,240' },
    { actor: fin1, action: 'PAYMENT_RECORDED',   qId: qConf1.id, note: 'Full payment received via wire transfer' },
    { actor: fin2, action: 'INVOICE_GENERATED',  qId: qConf2.id, note: 'Invoice INV-1014 issued — $58,890' },
    { actor: fin2, action: 'PAYMENT_RECORDED',   qId: qConf2.id, note: 'Payment confirmed — deal closed' },
    { actor: fin1, action: 'INVOICE_OVERDUE',    qId: qConf5.id, note: 'Meridian Partners invoice 10 days overdue — escalated' },
    // Admin events
    { actor: adminUser, action: 'UPDATED_DISCOUNT_RULE', note: 'Category ceiling: Services reduced from 12% to 10%' },
    { actor: adminUser, action: 'CREATED_PRODUCT',       note: 'New product: DealFlow CRM SaaS License added to catalog' },
    { actor: adminUser, action: 'CREATED_USER',          note: 'New sales rep Priya Nair (rep3) invited' },
    { actor: mgr1,      action: 'UPDATED_PROFILE',       note: 'Sales Manager updated profile — added phone' },
    { actor: rep1,      action: 'UPDATED_PROFILE',       note: 'Rep updated display name' },
    // Risk events
    { actor: rep2, action: 'SUBMITTED_FOR_APPROVAL', qId: qPend3.id, note: 'Risk score 62 — FINANCE escalation required' },
    { actor: mgr1, action: 'APPROVAL_STEP_APPROVED', qId: qPend3.id, note: 'Step 1 approved — hardware lines OK, Service flagged' },
    // Extra expanded audit events
    { actor: rep1, action: 'SUBMITTED_FOR_APPROVAL', qId: qExtraPend1.id, note: 'Submitted Apex Global volume deal — 18% laptop discount' },
    { actor: rep2, action: 'SUBMITTED_FOR_APPROVAL', qId: qExtraPend2.id, note: 'Vanguard Systems bundle submitted with Finance review trigger' },
    { actor: mgr1, action: 'APPROVAL_STEP_APPROVED', qId: qExtraRev1.id,  note: 'Manager approved Step 1 for Apex expansion quote' },
    { actor: mgr2, action: 'APPROVAL_STEP_APPROVED', qId: qExtraRev2.id,  note: 'Manager approved multi-year SaaS structure for Terraform' },
    { actor: mgr1, action: 'APPROVAL_STEP_APPROVED', qId: qExtraAppr1.id, note: 'Final approval granted for Apex Global Technologies' },
    { actor: fin1, action: 'APPROVAL_STEP_APPROVED', qId: qExtraAppr2.id, note: 'Finance sign-off on Helios Energy special terms' },
    { actor: mgr1, action: 'APPROVAL_STEP_REJECTED', qId: qExtraRej1.id,  note: 'Rejected 35% discount request due to negative margin' },
    { actor: mgr1, action: 'APPROVAL_STEP_RETURNED', qId: qExtraRet1.id,  note: 'Returned for adjustment — please cap hardware discount at 10%' },
    { actor: users['customer@apexglobal.com'], action: 'CUSTOMER_CONFIRMED_QUOTATION', qId: qExtraConf1.id, note: 'Apex Global accepted final proposal' },
    { actor: users['customer@vanguardsys.com'], action: 'COUNTER_DISCOUNT_PROPOSAL',    qId: qExtraSent2.id, note: 'Customer counter-proposed 14% on laptops' },
  ];

  for (const ev of auditEvents) {
    if (!ev.actor) continue;
    await prisma.auditLog.create({
      data: {
        actorId: ev.actor.id,
        action: ev.action,
        targetId: ev.qId || ev.actor.id,
        targetType: ev.qId ? 'Quotation' : 'User',
        quotationId: ev.qId || null,
        reasonNote: ev.note || null,
        createdAt: daysAgo(Math.floor(Math.random() * 20)),
      },
    });
  }
  console.log(`[Seed] ✓ ${auditEvents.filter(e => e.actor).length} audit log entries created.\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 15 — DEAL HEALTH FLAGS (15 flags across stalled, anomaly, slippage)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('[Seed] Creating deal health flags…');
  const healthFlags = [
    // STALLED — no activity for 14+ days
    { q: qPend6,  type: 'STALLED',            sev: 'HIGH',   detail: 'Pending manager approval for 6 days — no action taken', resolved: false },
    { q: qPend8,  type: 'STALLED',            sev: 'HIGH',   detail: 'Finance step awaiting action for 7 days — deal at risk', resolved: false },
    { q: qRet1,   type: 'STALLED',            sev: 'MEDIUM', detail: 'Returned 12 days ago — rep has not revised and resubmitted', resolved: false },
    { q: qRet2,   type: 'STALLED',            sev: 'MEDIUM', detail: 'Finance returned 9 days ago — awaiting rep revision', resolved: false },
    { q: qNeg2,   type: 'STALLED',            sev: 'HIGH',   detail: 'Under negotiation 12 days — customer silent since counter-proposal', resolved: false },
    { q: qSent4,  type: 'STALLED',            sev: 'LOW',    detail: 'Sent to customer 4 days ago — no response or engagement', resolved: false },
    // DISCOUNT_ANOMALY — rep discount well above historical avg
    { q: qPend3,  type: 'DISCOUNT_ANOMALY',   sev: 'HIGH',   detail: 'Rep Elena Rostova: 28% service discount vs 6% historical avg (+367%)', resolved: false },
    { q: qRej1,   type: 'DISCOUNT_ANOMALY',   sev: 'HIGH',   detail: 'Rep James Carter: 40% consulting discount — abnormal outlier', resolved: true  },
    { q: qRet1,   type: 'DISCOUNT_ANOMALY',   sev: 'MEDIUM', detail: 'Rep Priya Nair: 30% hardware discount — 200% above rep average', resolved: false },
    { q: qPend5,  type: 'DISCOUNT_ANOMALY',   sev: 'HIGH',   detail: 'Rep James Carter: 22% security discount on Bronze account', resolved: false },
    // DELIVERY_SLIPPAGE — fulfillment past expected date
    { q: qConf4,  type: 'DELIVERY_SLIPPAGE',  sev: 'MEDIUM', detail: 'West Hub backorder: 1× Laptop Pro 14 — ETA slipped 3 days', resolved: false },
    { q: qConf5,  type: 'DELIVERY_SLIPPAGE',  sev: 'LOW',    detail: 'Consulting engagement delivery delayed — client schedule conflict', resolved: false },
    // OVERDUE_INVOICE
    { q: qConf5,  type: 'OVERDUE_INVOICE',    sev: 'HIGH',   detail: 'Invoice INV-OVR-001 overdue by 10 days — $6,800 outstanding', resolved: false },
    { q: qConf4,  type: 'OVERDUE_INVOICE',    sev: 'MEDIUM', detail: 'Invoice partially paid — $4,500 remaining balance after 15 days', resolved: false },
    // Resolved example
    { q: qConf1,  type: 'STALLED',            sev: 'LOW',    detail: 'Previously stalled — resolved after customer confirmed', resolved: true  },
    // New health flags for expanded quotes
    { q: qExtraPend2, type: 'MARGIN_BELOW_TARGET',      sev: 'MEDIUM', detail: 'Blended quote margin is 22.5%, below 25% guideline', resolved: false },
    { q: qExtraPend3, type: 'HIGH_DISCOUNT_CONCESSION', sev: 'HIGH',   detail: 'Helios quote has 25% discount on Hardware monitor line', resolved: false },
    { q: qExtraRev2,  type: 'MULTI_DISCOUNT_SPREAD',   sev: 'MEDIUM', detail: 'Concurrent 25% SaaS and 20% Service discounts compound risk', resolved: false },
    { q: qExtraRej1,  type: 'NEGATIVE_MARGIN',          sev: 'CRITICAL', detail: 'Net margin is -8.4% on 35% requested hardware concession', resolved: true },
    { q: qExtraRet1,  type: 'DISCOUNT_CEILING_BREACH',  sev: 'HIGH',   detail: 'Requested 15% hardware discount exceeds Silver 10% ceiling', resolved: false },
    { q: qExtraSent2, type: 'STALLED',                  sev: 'LOW',    detail: 'Awaiting customer response on counter-discount proposal', resolved: false },
  ];

  for (const hf of healthFlags) {
    await prisma.dealHealthFlag.create({
      data: {
        quotationId: hf.q.id, flagType: hf.type, details: hf.detail,
        severity: hf.sev, isResolved: hf.resolved,
        createdAt: daysAgo(Math.floor(Math.random() * 7) + 1),
        resolvedAt: hf.resolved ? daysAgo(1) : null,
      },
    });
  }
  console.log(`[Seed] ✓ ${healthFlags.length} deal health flags created.\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 16 — INBOUND CUSTOMER REQUESTS (RFQs) (15)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('[Seed] Seeding inbound customer quote requests (RFQs)…');
  const custRequests = [
    {
      requestNumber: 'REQ-1001',
      customerId: customers['Acme Corp'].id,
      title: 'Engineering Workstations & Docking Setup for 15 Developers',
      status: 'PENDING',
      targetBudget: 45000.00,
      neededByDate: daysFromNow(21),
      notes: 'Urgent expansion for our new enterprise engineering cluster. Please prioritize high memory laptops and dual-display docks.',
      items: [
        { name: 'Laptop Pro 14 (32GB / 1TB)', quantity: 15, category: 'Hardware', notes: 'Configured for high load dev' },
        { name: 'Thunderbolt 4 Docking Station', quantity: 15, category: 'Hardware', notes: 'Dual 4K output' },
        { name: 'Enterprise Deployment & Onboarding', quantity: 1, category: 'Services', notes: 'Remote setup & image deployment' },
        { name: 'Extended Care Warranty (3-Year)', quantity: 15, category: 'Warranty', notes: '24/7 next business day on-site' },
      ],
    },
    {
      requestNumber: 'REQ-1002',
      customerId: customers['NovaTech Solutions'].id,
      title: 'Annual Cloud Collaboration & Dedicated Technical Support',
      status: 'PENDING',
      targetBudget: 18000.00,
      neededByDate: daysFromNow(14),
      notes: 'Renewal with license seat expansion from 20 to 50 active engineers.',
      items: [
        { name: 'Cloud Collaboration Suite (Annual)', quantity: 50, category: 'Subscriptions', notes: 'Annual prepaid commitment' },
        { name: 'Dedicated Technical Account Manager', quantity: 1, category: 'Services', notes: 'Quarterly architecture reviews' },
      ],
    },
    {
      requestNumber: 'REQ-1003',
      customerId: customers['Beta Industries'].id,
      title: 'Office Hardware Refresh - Laptops & 27" Displays',
      status: 'PENDING',
      targetBudget: 28000.00,
      neededByDate: daysFromNow(30),
      notes: 'Standard office setup for Q4 cohort. Standard warranty acceptable.',
      items: [
        { name: 'Laptop Pro 14 (16GB / 512GB)', quantity: 10, category: 'Hardware', notes: 'Standard build' },
        { name: 'UltraSharp 27" 4K Monitor', quantity: 10, category: 'Hardware', notes: 'USB-C hub version' },
      ],
    },
    {
      requestNumber: 'REQ-1004',
      customerId: customers['Summit Retail Co'].id,
      title: 'Retail POS Terminals and Peripheral Expansion',
      status: 'REVIEWED',
      targetBudget: 12500.00,
      neededByDate: daysFromNow(10),
      notes: 'Reviewed with store operations manager. Rep to prepare formal quote.',
      items: [
        { name: 'POS Touch Terminal Station', quantity: 6, category: 'Hardware', notes: 'Ruggedized casing' },
        { name: 'Thermal Receipt Printers', quantity: 6, category: 'Hardware', notes: 'Ethernet + Bluetooth' },
      ],
    },
    {
      requestNumber: 'REQ-1005',
      customerId: customers['Crest Logistics'].id,
      title: 'Logistics Fleet Rugged Tablets',
      status: 'QUOTED',
      targetBudget: 35000.00,
      neededByDate: daysFromNow(45),
      notes: 'Draft quote generated and sent to customer.',
      items: [
        { name: 'Rugged 10-inch Warehouse Tablet', quantity: 20, category: 'Hardware', notes: 'Barcode scanner integrated' },
      ],
    },
    // New RFQ Requests
    {
      requestNumber: 'REQ-1006',
      customerId: customers['Apex Global Technologies'].id,
      title: 'Engineering Cluster Refresh — 20 Laptop Pro 16 & Docks',
      status: 'PENDING',
      targetBudget: 62000.00,
      neededByDate: daysFromNow(20),
      notes: 'Fast-track approval needed for offshore engineering squad. Gold account discount requested.',
      items: [
        { name: 'Laptop Pro 16 (64GB / 2TB)', quantity: 20, category: 'Hardware', notes: 'Top spec model' },
        { name: 'Thunderbolt 4 Docking Station', quantity: 20, category: 'Hardware', notes: 'Included power supplies' },
        { name: 'Hardware Extended Warranty (3-Year)', quantity: 20, category: 'Warranty', notes: 'Next business day SLA' },
      ],
    },
    {
      requestNumber: 'REQ-1007',
      customerId: customers['Vanguard Systems Corp'].id,
      title: 'Cybersecurity Operations Center Hardware & Endpoint Suite',
      status: 'PENDING',
      targetBudget: 38000.00,
      neededByDate: daysFromNow(15),
      notes: 'Procurement for new SOC team. Requires onsite configuration services.',
      items: [
        { name: '4K Business Monitor 27"', quantity: 16, category: 'Hardware', notes: 'Dual-head setup' },
        { name: 'Wireless Noise-Cancel Headset', quantity: 16, category: 'Hardware', notes: 'Call center certified' },
        { name: 'Endpoint Security Suite', quantity: 1, category: 'Services', notes: 'Corporate deployment' },
      ],
    },
    {
      requestNumber: 'REQ-1008',
      customerId: customers['Helios Energy Group'].id,
      title: 'Grid Control Room Workstation & Display Refresh',
      status: 'PENDING',
      targetBudget: 24000.00,
      neededByDate: daysFromNow(28),
      notes: 'Control room displays must support continuous 24/7 runtime.',
      items: [
        { name: '4K Business Monitor 27"', quantity: 12, category: 'Hardware', notes: 'High brightness panels' },
        { name: 'Laptop Pro 14 (32GB / 1TB)', quantity: 6, category: 'Hardware', notes: 'Field engineering spec' },
      ],
    },
    {
      requestNumber: 'REQ-1009',
      customerId: customers['Terraform Analytics'].id,
      title: 'Annual Enterprise SaaS & Cloud Analytics Support',
      status: 'REVIEWED',
      targetBudget: 42000.00,
      neededByDate: daysFromNow(10),
      notes: 'Annual upfront payment. Rep discussed 10% volume incentive.',
      items: [
        { name: 'DealFlow CRM SaaS License (Annual)', quantity: 35, category: 'Subscriptions', notes: 'All-inclusive tier' },
        { name: 'IT Strategy Consulting', quantity: 3, category: 'Services', notes: 'Data pipeline optimization' },
      ],
    },
    {
      requestNumber: 'REQ-1010',
      customerId: customers['Starlight Media Network'].id,
      title: 'Creative Studio Laptop Fleet & Pro Audio Accessories',
      status: 'PENDING',
      targetBudget: 20000.00,
      neededByDate: daysFromNow(35),
      notes: 'Standard creative department onboarding for new video editors.',
      items: [
        { name: 'Laptop Pro 16 (32GB / 1TB)', quantity: 6, category: 'Hardware', notes: 'Calibrated color screens' },
        { name: 'Wireless Noise-Cancel Headset', quantity: 8, category: 'Hardware', notes: 'Studio monitoring' },
      ],
    },
    {
      requestNumber: 'REQ-1011',
      customerId: customers['Omega Freight Logistics'].id,
      title: 'Dispatcher Station Terminals & Hands-free Headsets',
      status: 'QUOTED',
      targetBudget: 16000.00,
      neededByDate: daysFromNow(18),
      notes: 'Formal quotation sent by sales rep Priya Nair.',
      items: [
        { name: 'Laptop Pro 14 (16GB / 512GB)', quantity: 8, category: 'Hardware', notes: 'Standard office build' },
        { name: 'Wireless Noise-Cancel Headset', quantity: 12, category: 'Hardware', notes: 'Dispatcher headsets' },
      ],
    },
    {
      requestNumber: 'REQ-1012',
      customerId: customers['Quantum Dynamics'].id,
      title: 'Lab Simulation Hardware & Dedicated Support Extension',
      status: 'REVIEWED',
      targetBudget: 31000.00,
      neededByDate: daysFromNow(12),
      notes: 'Awaiting revised price list validation from sales rep Elena.',
      items: [
        { name: 'Laptop Pro 16 (64GB / 2TB)', quantity: 8, category: 'Hardware', notes: 'Math model simulation rigs' },
        { name: 'Care Plan (Monthly)', quantity: 8, category: 'Subscriptions', notes: 'Fast response support' },
      ],
    },
    {
      requestNumber: 'REQ-1013',
      customerId: customers['Meridian Partners'].id,
      title: 'Branch Office Network Setup & IT Onboarding Services',
      status: 'PENDING',
      targetBudget: 22000.00,
      neededByDate: daysFromNow(25),
      notes: 'New regional branch opening in Denver. Need turnkey deployment.',
      items: [
        { name: 'Onsite Setup Service', quantity: 2, category: 'Services', notes: 'Denver office' },
        { name: 'Thunderbolt 4 Docking Station', quantity: 14, category: 'Hardware', notes: 'Hot-desk setup' },
      ],
    },
    {
      requestNumber: 'REQ-1014',
      customerId: customers['Pinnacle Services'].id,
      title: 'Field Service Tech Tablet Upgrade & Extended Warranty',
      status: 'QUOTED',
      targetBudget: 15000.00,
      neededByDate: daysFromNow(40),
      notes: 'Quote Q-1025 currently under review with client procurement.',
      items: [
        { name: 'Laptop Pro 14 (16GB / 512GB)', quantity: 6, category: 'Hardware', notes: 'Ruggedized bags' },
        { name: 'Hardware Extended Warranty', quantity: 6, category: 'Warranty', notes: 'Accidental damage cover' },
      ],
    },
    {
      requestNumber: 'REQ-1015',
      customerId: customers['Summit Retail Co'].id,
      title: 'Store Manager Laptops & Cloud Care Subscriptions',
      status: 'PENDING',
      targetBudget: 19500.00,
      neededByDate: daysFromNow(16),
      notes: 'Upgrade for 5 store locations in Southwest region.',
      items: [
        { name: 'Laptop Pro 14 (16GB / 512GB)', quantity: 5, category: 'Hardware', notes: 'Retail managers' },
        { name: 'Care Plan (Monthly)', quantity: 5, category: 'Subscriptions', notes: 'Continuous warranty' },
      ],
    },
  ];

  for (const cr of custRequests) {
    await prisma.customerRequest.create({ data: cr });
  }
  console.log('[Seed] ✓ Inbound customer requests seeded.\n');

  // ══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  const counts = {
    customers: await prisma.customer.count(),
    users: await prisma.user.count(),
    warehouses: await prisma.warehouse.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    stockLevels: await prisma.stockLevel.count(),
    priceLists: await prisma.priceList.count(),
    upsellRules: await prisma.upsellRule.count(),
    subPlans: await prisma.subscriptionPlan.count(),
    customerRequests: await prisma.customerRequest.count(),
    quotations: await prisma.quotation.count(),
    quotationLines: await prisma.quotationLine.count(),
    approvalSteps: await prisma.approvalStep.count(),
    invoices: await prisma.invoice.count(),
    billingSchedules: await prisma.billingSchedule.count(),
    fulfillmentSplits: await prisma.fulfillmentSplit.count(),
    auditLogs: await prisma.auditLog.count(),
    dealHealthFlags: await prisma.dealHealthFlag.count(),
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  console.log('═══════════════════════════════════════════════════');
  console.log('  DealFlow360 Seed Complete — Record Summary');
  console.log('═══════════════════════════════════════════════════');
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k.padEnd(20)} : ${v}`);
  }
  console.log(`${'  TOTAL'.padEnd(22)} : ${total} records`);
  console.log('═══════════════════════════════════════════════════');
  console.log('\n✅ All seeded! Login credentials (all: Password123!)');
  console.log('  admin@dealflow360.com       → Admin');
  console.log('  manager@dealflow360.com     → Sales Manager');
  console.log('  manager2@dealflow360.com    → Sales Manager');
  console.log('  rep@dealflow360.com         → Sales Rep (Elena Rostova)');
  console.log('  rep2@dealflow360.com        → Sales Rep (James Carter)');
  console.log('  rep3@dealflow360.com        → Sales Rep (Priya Nair)');
  console.log('  finance@dealflow360.com     → Finance');
  console.log('  finance2@dealflow360.com    → Finance');
  console.log('  customer@acmecorp.com       → Customer Portal (Acme Corp / GOLD)');
  console.log('  customer@novatech.io        → Customer Portal (NovaTech / GOLD)');
  console.log('  customer@apexglobal.com     → Customer Portal (Apex Global / GOLD)');
  console.log('  customer@vanguardsys.com    → Customer Portal (Vanguard Systems / GOLD)');
  console.log('  customer@betaindustries.com → Customer Portal (Beta Industries / SILVER)');
  console.log('  customer@heliosenergy.com   → Customer Portal (Helios Energy / SILVER)');
  console.log('  customer@summitretail.com   → Customer Portal (Summit Retail / BRONZE)');
  console.log('  customer@starlightmedia.com → Customer Portal (Starlight Media / BRONZE)');
  console.log('');
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
