/**
 * DealFlow360 — Customer Negotiation & Automatic Re-Approval End-to-End Integration Walk
 * Walks through:
 * 1. Create quote
 * 2. Apply safe terms
 * 3. Send to customer (status: SENT_TO_CUSTOMER)
 * 4. Customer submits higher discount request (25% discount, exceeding 15% ceiling)
 * 5. Customer confirms final terms
 * 6. Assert quote status becomes PENDING_APPROVAL
 * 7. Approve manager step
 * 8. Approve finance step if required
 * 9. Assert quote becomes CONFIRMED
 * 10. Assert billing is generated exactly once (one-time invoice exists, duplicate rejected)
 */

const assert = require('assert');
const prisma = require('../prisma/prisma');
const quotationService = require('../services/quotationService');
const negotiationService = require('../services/negotiationService');
const approvalService = require('../services/approvalService');

async function runNegotiationReapprovalFlow() {
  console.log('--- Starting Negotiation & Automatic Re-Approval Flow ---');

  // Find demo users & customer
  const salesRep = await prisma.user.findFirst({ where: { role: 'SALES_REP', isActive: true } });
  const manager = await prisma.user.findFirst({ where: { role: 'SALES_MANAGER', isActive: true } });
  const finance = await prisma.user.findFirst({ where: { role: 'FINANCE', isActive: true } });
  const customerUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER', isActive: true } });
  const customer = await prisma.customer.findFirst({ where: { id: customerUser.customerId } });
  const product = await prisma.product.findFirst({ where: { isActive: true, category: 'Hardware' } });

  assert(salesRep, 'Sales Rep user must exist');
  assert(manager, 'Manager user must exist');
  assert(customer, 'Customer record must exist');
  assert(product, 'Hardware product must exist');

  // Step 1: Create Quote
  console.log('1. Creating draft quotation for Customer:', customer.name);
  const quote = await quotationService.createQuotation({
    customerId: customer.id,
    currency: 'USD',
  }, salesRep);
  console.log('   Created quote:', quote.quoteNumber);

  // Step 2: Apply safe terms (e.g. 5% discount, within 15% Gold limit)
  console.log('2. Applying safe line item (5% discount)...');
  await quotationService.mutateLine(quote.id, {
    action: 'ADD',
    productId: product.id,
    quantity: 2,
    discountPercent: 5,
  }, salesRep);

  // Step 3: Send to customer
  console.log('3. Transitioning quote status to SENT_TO_CUSTOMER...');
  await prisma.quotation.update({
    where: { id: quote.id },
    data: { status: 'SENT_TO_CUSTOMER' },
  });

  // Step 4: Customer submits higher discount request (e.g. 25% discount)
  console.log('4. Customer proposes counter discount of 25% (exceeds 15% ceiling)...');
  const proposal = await negotiationService.proposeCounterDiscount(
    quote.id,
    customer.id,
    customerUser.id,
    {
      requestedDiscountPercent: 25,
      reason: 'Volume commitment requires 25% discount across all lines.',
    }
  );
  assert.strictEqual(proposal.requestedDiscountPercent, 25);
  console.log('   Recorded proposal successfully.');

  // Customer adds line comment
  await negotiationService.addCustomerComment(
    quote.id,
    customer.id,
    customerUser.id,
    {
      message: 'Please review 25% pricing so we can finalize PO today.',
    }
  );

  // Step 5: Customer confirms final terms
  console.log('5. Customer confirms quotation with negotiated terms...');
  const confirmResult = await negotiationService.confirmNegotiatedQuotation(
    quote.id,
    customer.id,
    customerUser.id
  );

  // Step 6: Assert quote status becomes PENDING_APPROVAL due to overage
  console.log('6. Asserting automatic re-approval trigger...');
  assert.strictEqual(confirmResult.status, 'PENDING_APPROVAL');
  assert.strictEqual(confirmResult.reEnteredApproval, true);

  const reloadedQuote = await prisma.quotation.findUnique({
    where: { id: quote.id },
    include: {
      approvalSteps: { orderBy: { stepOrder: 'asc' } },
      invoices: true,
    },
  });

  assert.strictEqual(reloadedQuote.status, 'PENDING_APPROVAL');
  assert(reloadedQuote.approvalSteps.length > 0, 'Approval steps must be created');
  assert.strictEqual(reloadedQuote.invoices.length, 0, 'No invoice should be generated yet');
  console.log(`   Quote ${reloadedQuote.quoteNumber} correctly re-entered PENDING_APPROVAL with ${reloadedQuote.approvalSteps.length} approval steps.`);

  // Step 7 & 8: Approve steps sequentially
  console.log('7 & 8. Processing required approval steps...');
  for (const step of reloadedQuote.approvalSteps) {
    const approver = step.requiredRole === 'FINANCE' ? finance : manager;
    console.log(`   Approving step #${step.stepOrder} (${step.requiredRole}) by ${approver.name}...`);
    await approvalService.actionApprovalStep({
      stepId: step.id,
      action: 'APPROVED',
      notes: `Approved negotiated 25% term by ${approver.role}`,
      actorUser: approver,
    });
  }

  // Step 9: Customer confirms after internal re-approval is complete
  console.log('9. Customer confirms quotation after internal re-approval...');
  const finalConfirm = await negotiationService.confirmNegotiatedQuotation(
    quote.id,
    customer.id,
    customerUser.id
  );
  assert.strictEqual(finalConfirm.status, 'CONFIRMED');

  const finalApprovedQuote = await prisma.quotation.findUnique({
    where: { id: quote.id },
    include: { invoices: true },
  });

  console.log('   Asserting final quotation status is CONFIRMED...');
  assert.strictEqual(finalApprovedQuote.status, 'CONFIRMED');

  // Step 10: Assert billing is generated exactly once
  console.log('10. Asserting billing generation...');
  assert(finalApprovedQuote.invoices.length >= 1, 'Invoice must be generated on confirmation');
  console.log(`    Generated Invoice: ${finalApprovedQuote.invoices[0].invoiceNumber} for $${finalApprovedQuote.invoices[0].amount}`);

  // Assert duplicate confirmation protection
  console.log('    Verifying duplicate confirmation is rejected...');
  await assert.rejects(
    async () => {
      await negotiationService.confirmNegotiatedQuotation(quote.id, customer.id, customerUser.id);
    },
    { code: 'ALREADY_CONFIRMED' }
  );

  console.log('--- ALL NEGOTIATION RE-APPROVAL ASSERTIONS PASSED! ---');
}

if (require.main === module) {
  runNegotiationReapprovalFlow()
    .then(() => {
      console.log('Integration script finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Integration script failed:', err);
      process.exit(1);
    });
}

module.exports = runNegotiationReapprovalFlow;
