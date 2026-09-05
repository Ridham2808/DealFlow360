const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting DealFlow360 database seed...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Seed Demo Customer Account
  const customerAcme = await prisma.customer.upsert({
    where: { email: 'billing@acmecorp.com' },
    update: {},
    create: {
      name: 'Acme Enterprise Inc.',
      companyName: 'Acme Corp',
      email: 'billing@acmecorp.com',
      phone: '+1-555-0199',
      taxId: 'US-987654321',
      address: '100 Innovation Way, Suite 400',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'USA',
      creditLimit: 150000.00,
      paymentTerms: 'Net 30',
      status: 'ACTIVE',
      contacts: {
        create: [
          {
            firstName: 'Sarah',
            lastName: 'Connor',
            email: 'customer@acmecorp.com',
            phone: '+1-555-0144',
            title: 'VP of Procurement',
            isPrimary: true,
          },
        ],
      },
    },
  });
  console.log(`[Seed] Seeded Customer: ${customerAcme.companyName}`);

  // 2. Seed Users across all 5 roles
  const users = [
    {
      email: 'admin@dealflow360.com',
      firstName: 'Alex',
      lastName: 'Vance',
      role: 'ADMIN',
      phone: '+1-555-0100',
    },
    {
      email: 'manager@dealflow360.com',
      firstName: 'Marcus',
      lastName: 'Brody',
      role: 'SALES_MANAGER',
      phone: '+1-555-0101',
    },
    {
      email: 'rep@dealflow360.com',
      firstName: 'Elena',
      lastName: 'Rostova',
      role: 'SALES_REP',
      phone: '+1-555-0102',
    },
    {
      email: 'finance@dealflow360.com',
      firstName: 'Fiona',
      lastName: 'Gallagher',
      role: 'FINANCE',
      phone: '+1-555-0103',
    },
    {
      email: 'customer@acmecorp.com',
      firstName: 'Sarah',
      lastName: 'Connor',
      role: 'CUSTOMER',
      phone: '+1-555-0144',
      customerId: customerAcme.id,
    },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        passwordHash,
        customerId: u.customerId || null,
      },
      create: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        phone: u.phone,
        customerId: u.customerId || null,
      },
    });
    console.log(`[Seed] Seeded User: ${user.email} (${user.role})`);
  }

  // 3. Seed Product Categories
  const catHardware = await prisma.productCategory.upsert({
    where: { slug: 'enterprise-hardware' },
    update: {},
    create: {
      name: 'Enterprise Hardware',
      slug: 'enterprise-hardware',
      description: 'High-performance servers, edge devices, and rack infrastructure',
    },
  });

  const catSoftware = await prisma.productCategory.upsert({
    where: { slug: 'saas-subscriptions' },
    update: {},
    create: {
      name: 'SaaS Subscriptions',
      slug: 'saas-subscriptions',
      description: 'Cloud licenses, enterprise tier seats, and compliance add-ons',
    },
  });

  // 4. Seed Products
  const prodServer = await prisma.product.upsert({
    where: { sku: 'HW-SRV-9000' },
    update: {},
    create: {
      sku: 'HW-SRV-9000',
      name: 'ApexCompute Enterprise Rack Server 2U',
      description: 'Dual 64-Core Xeon processors, 512GB ECC RAM, NVMe Array',
      categoryId: catHardware.id,
      basePrice: 12500.00,
      costPrice: 8200.00,
      currency: 'USD',
      unitOfMeasure: 'UNIT',
      inventoryCount: 45,
    },
  });

  const prodLicense = await prisma.product.upsert({
    where: { sku: 'SW-LIC-PLAT' },
    update: {},
    create: {
      sku: 'SW-LIC-PLAT',
      name: 'DealFlow Platform License (Annual Enterprise Seat)',
      description: 'Full sales ops automation, approval governance, and AI insights',
      categoryId: catSoftware.id,
      basePrice: 1800.00,
      costPrice: 300.00,
      currency: 'USD',
      unitOfMeasure: 'SEAT/YEAR',
      inventoryCount: 9999,
    },
  });

  // 5. Seed PriceBook
  const defaultPriceBook = await prisma.priceBook.upsert({
    where: { id: 'pricebook-standard-usd-2026' },
    update: {},
    create: {
      id: 'pricebook-standard-usd-2026',
      name: 'Standard Commercial Global Price Book 2026',
      description: 'Default price book applied to all North American and global enterprise accounts',
      currency: 'USD',
      isDefault: true,
      isActive: true,
      entries: {
        create: [
          {
            productId: prodServer.id,
            unitPrice: 12500.00,
            minQuantity: 1,
          },
          {
            productId: prodLicense.id,
            unitPrice: 1800.00,
            minQuantity: 1,
          },
        ],
      },
    },
  });
  console.log(`[Seed] Seeded PriceBook: ${defaultPriceBook.name}`);

  // 6. Seed Approval Rules (Pricing Governance)
  const approvalRules = [
    {
      name: 'Rep Autonomous Authority (0% - 10%)',
      minDiscountPercent: 0.00,
      maxDiscountPercent: 10.00,
      requiredRole: 'SALES_REP',
      isActive: true,
    },
    {
      name: 'Sales Manager Escalation Tier (10.01% - 20%)',
      minDiscountPercent: 10.01,
      maxDiscountPercent: 20.00,
      requiredRole: 'SALES_MANAGER',
      isActive: true,
    },
    {
      name: 'Executive Finance Approval Tier (>20%)',
      minDiscountPercent: 20.01,
      maxDiscountPercent: 100.00,
      requiredRole: 'FINANCE',
      isActive: true,
    },
  ];

  for (const rule of approvalRules) {
    await prisma.approvalRule.create({
      data: rule,
    });
  }
  console.log('[Seed] Seeded Approval Governance Rules');

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
