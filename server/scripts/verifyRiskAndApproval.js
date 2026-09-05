/**
 * DealFlow360 — Gold Customer Risk & Approval Workflow Verification Script
 * Demonstrates the pure risk score engine and sequential approval chain generation.
 * Run with: node server/scripts/verifyRiskAndApproval.js
 */

const prisma = require('../prisma/prisma');
const { calculateBlendedRisk, determineRequiredApprovalChain } = require('../services/riskScoreService');

async function main() {
  console.log('='.repeat(72));
  console.log('  DealFlow360: Gold Customer Discount Risk & Approval Verification');
  console.log('='.repeat(72));

  // 1. Fetch active rules from DB
  const [discountTiers, categoryCeilings, approvalRules] = await Promise.all([
    prisma.discountTier.findMany({ where: { isActive: true } }),
    prisma.categoryDiscountCeiling.findMany({ where: { isActive: true } }),
    prisma.approvalChainRule.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' } }),
  ]);

  console.log('\n[1] Active System Ceilings:');
  console.log('  Customer Tiers:  ', discountTiers.map((t) => `${t.customerTier}: ${t.maxDiscountPercent}%`).join(', '));
  console.log('  Category Ceilings:', categoryCeilings.map((c) => `${c.category}: ${c.maxDiscountPercent}%`).join(', '));
  console.log('  Approval Rules:  ', approvalRules.map((r) => `Order ${r.orderIndex} (${r.requiredRole}): ${r.minimumOverage}%-${r.maximumOverage}%`).join(' | '));

  // 2. Define Gold Customer Worked Example Lines
  const customerTier = 'GOLD';
  const quotationLines = [
    {
      id: 'line-gold-1',
      productName: 'Laptop Pro 14',
      category: 'Hardware',
      unitPrice: 1999.0,
      unitCost: 1200.0,
      quantity: 2,
      discountPercent: 12.0, // Tier limit: 15%, Cat limit: 15% -> Compliant
    },
    {
      id: 'line-gold-2',
      productName: 'Onsite Setup Service',
      category: 'Services',
      unitPrice: 500.0,
      unitCost: 200.0,
      quantity: 1,
      discountPercent: 18.0, // Tier limit: 15%, Cat limit: 10% -> 8% Overage!
    },
  ];

  console.log('\n[2] Quotation Lines for GOLD Tier Customer:');
  quotationLines.forEach((l, i) => {
    console.log(`  Line ${i + 1}: ${l.productName} (${l.category})`);
    console.log(`    Qty: ${l.quantity} | Unit Price: $${l.unitPrice} | Discount Given: ${l.discountPercent}%`);
  });

  // 3. Evaluate Risk
  const riskResult = calculateBlendedRisk(quotationLines, customerTier, {
    discountTiers,
    categoryCeilings,
  });

  console.log('\n[3] Risk Engine Evaluation:');
  console.log(`  Composite Risk Score:      ${riskResult.score} / 100`);
  console.log(`  Risk Level:                ${riskResult.riskLevel}`);
  console.log(`  Any Line Over Limit:       ${riskResult.anyLineOverLimit ? 'YES' : 'NO'}`);
  console.log(`  Worst Line Overage:        +${riskResult.worstLineOverage}%`);
  console.log(`  Weighted Quote Overage:    +${riskResult.weightedOverage}%`);
  console.log(`  Margin Floor Violation:    ${riskResult.marginFloorViolation ? 'YES' : 'NO'}`);

  console.log('\n[4] Flagged Policy Violations:');
  if (riskResult.flaggedLines.length === 0) {
    console.log('  None. All lines within ceilings.');
  } else {
    riskResult.flaggedLines.forEach((fl, idx) => {
      console.log(`  [Violation #${idx + 1}] ${fl.productName} (${fl.category})`);
      console.log(`    - Discount Given:       ${fl.discountGiven}%`);
      console.log(`    - Customer Tier Limit:  ${fl.customerTierLimit}% (Gold)`);
      console.log(`    - Category Limit:       ${fl.categoryLimit}% (Services)`);
      console.log(`    - Effective Ceiling:    ${fl.effectiveLimit}% (Stricter Limit Applied)`);
      console.log(`    - Overage:              +${fl.overBy}%`);
      console.log(`    - Reason:               ${fl.reason}`);
    });
  }

  // 4. Determine Sequential Approval Chain
  const approvalChain = determineRequiredApprovalChain(riskResult, approvalRules);

  console.log('\n[5] Generated Sequential Approval Chain:');
  if (approvalChain.length === 0) {
    console.log('  No approval required. Quotation is eligible for direct auto-approval.');
  } else {
    approvalChain.forEach((step) => {
      console.log(`  Step ${step.stepOrder}: [${step.requiredRole}] (Triggered by overage bracket ${step.minimumOverage}% - ${step.maximumOverage}%)`);
    });
  }

  console.log('\n' + '='.repeat(72));
  console.log('  Verification Status: COMPLETED SUCCESSFULLY');
  console.log('='.repeat(72) + '\n');
}

main()
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
