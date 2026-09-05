const request = require('supertest');
const app = require('../app');
const prisma = require('../prisma/prisma');
const approvalService = require('../services/approvalService');
const { generateToken } = require('../utils/tokenHelper');

describe('Approval Service & Workflow Hardening Integration Suite', () => {
  let repUser;
  let managerUser;
  let financeUser;
  let adminUser;
  let customerAcme;
  let hardwareProduct;
  let serviceProduct;

  let repToken;
  let managerToken;
  let financeToken;
  let adminToken;

  beforeAll(async () => {
    // 1. Fetch seeded users
    [repUser, managerUser, financeUser, adminUser] = await Promise.all([
      prisma.user.findUnique({ where: { email: 'rep@dealflow360.com' } }),
      prisma.user.findUnique({ where: { email: 'manager@dealflow360.com' } }),
      prisma.user.findUnique({ where: { email: 'finance@dealflow360.com' } }),
      prisma.user.findUnique({ where: { email: 'admin@dealflow360.com' } }),
    ]);

    repToken = generateToken({ userId: repUser.id, email: repUser.email, role: repUser.role });
    managerToken = generateToken({ userId: managerUser.id, email: managerUser.email, role: managerUser.role });
    financeToken = generateToken({ userId: financeUser.id, email: financeUser.email, role: financeUser.role });
    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, role: adminUser.role });

    customerAcme = await prisma.customer.findUnique({ where: { email: 'contact@acmecorp.com' } });
    hardwareProduct = await prisma.product.findFirst({ where: { category: 'Hardware' } });
    serviceProduct = await prisma.product.findFirst({ where: { category: 'Services' } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Quotation Submission & Server-Side Risk Assessment', () => {
    it('should auto-approve quote with zero overages (DRAFT -> APPROVED, 0 approval steps)', async () => {
      // Create compliant quotation for Gold customer: 10% discount on Hardware (limit 15%)
      const quote = await prisma.quotation.create({
        data: {
          quoteNumber: `TEST-AUTO-${Date.now()}`,
          customerId: customerAcme.id,
          ownerRepId: repUser.id,
          status: 'DRAFT',
          subtotal: 2000.0,
          discountTotal: 200.0,
          grandTotal: 1800.0,
          totalCost: 1000.0,
          marginAmount: 800.0,
          marginPercentage: 44.4,
          lines: {
            create: [
              {
                productId: hardwareProduct.id,
                productNameSnapshot: hardwareProduct.name,
                categorySnapshot: hardwareProduct.category,
                quantity: 1,
                unitPrice: 2000.0,
                unitCost: 1000.0,
                discountPercent: 10.0, // within 15% Gold limit
                lineSubtotal: 2000.0,
                lineDiscountAmount: 200.0,
                lineMargin: 800.0,
              },
            ],
          },
        },
      });

      const result = await approvalService.submitQuotation(quote.id, repUser);

      expect(result.quotation.status).toBe('APPROVED');
      expect(result.riskResult.anyLineOverLimit).toBe(false);
      expect(result.riskResult.riskLevel).toBe('NONE');
      expect(result.approvalSteps).toHaveLength(0);

      // Verify AuditLog record was written
      const auditLog = await prisma.auditLog.findFirst({
        where: { quotationId: quote.id, action: 'QUOTATION_AUTO_APPROVED' },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog.actorId).toBe(repUser.id);
      expect(auditLog.afterStatus).toBe('APPROVED');
    });

    it('should route high-overage quote to sequential Sales Manager then Finance chain (DRAFT -> PENDING_APPROVAL)', async () => {
      // 30% discount on Hardware (15% over Gold 15% limit -> triggers Finance rule)
      const quote = await prisma.quotation.create({
        data: {
          quoteNumber: `TEST-HIGH-${Date.now()}`,
          customerId: customerAcme.id,
          ownerRepId: repUser.id,
          status: 'DRAFT',
          subtotal: 3000.0,
          discountTotal: 900.0,
          grandTotal: 2100.0,
          totalCost: 1000.0,
          lines: {
            create: [
              {
                productId: hardwareProduct.id,
                productNameSnapshot: hardwareProduct.name,
                categorySnapshot: hardwareProduct.category,
                quantity: 1,
                unitPrice: 3000.0,
                unitCost: 1000.0,
                discountPercent: 30.0,
                lineSubtotal: 3000.0,
                lineDiscountAmount: 900.0,
                lineMargin: 1100.0,
              },
            ],
          },
        },
      });

      const result = await approvalService.submitQuotation(quote.id, repUser);

      expect(result.quotation.status).toBe('PENDING_APPROVAL');
      expect(result.riskResult.anyLineOverLimit).toBe(true);
      expect(result.riskResult.worstLineOverage).toBe(15.0);
      expect(result.riskResult.riskLevel).toBe('HIGH');

      // Sequential chain: Step 1 is Sales Manager, Step 2 is Finance
      expect(result.approvalSteps).toHaveLength(2);
      expect(result.approvalSteps[0].stepOrder).toBe(1);
      expect(result.approvalSteps[0].requiredRole).toBe('SALES_MANAGER');
      expect(result.approvalSteps[0].status).toBe('PENDING');

      expect(result.approvalSteps[1].stepOrder).toBe(2);
      expect(result.approvalSteps[1].requiredRole).toBe('FINANCE');
      expect(result.approvalSteps[1].status).toBe('PENDING');
    });

    it('should reject submission from an invalid state like APPROVED', async () => {
      const quote = await prisma.quotation.create({
        data: {
          quoteNumber: `TEST-INV-${Date.now()}`,
          customerId: customerAcme.id,
          ownerRepId: repUser.id,
          status: 'APPROVED',
          lines: {
            create: [
              {
                productId: hardwareProduct.id,
                productNameSnapshot: hardwareProduct.name,
                categorySnapshot: hardwareProduct.category,
                quantity: 1,
                unitPrice: 1000.0,
                unitCost: 500.0,
                lineSubtotal: 1000.0,
                lineDiscountAmount: 0.0,
                lineMargin: 500.0,
              },
            ],
          },
        },
      });

      await expect(approvalService.submitQuotation(quote.id, repUser)).rejects.toThrow(
        /Quotation cannot be submitted from status 'APPROVED'/
      );
    });
  });

  describe('2. Step Actioning, Concurrency, Role Guards & Sequential Order', () => {
    let activeQuote;
    let step1;
    let step2;

    beforeEach(async () => {
      // Create a quotation with two steps: Sales Manager (Step 1) and Finance (Step 2)
      activeQuote = await prisma.quotation.create({
        data: {
          quoteNumber: `TEST-CHAIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          customerId: customerAcme.id,
          ownerRepId: repUser.id,
          status: 'PENDING_APPROVAL',
          version: 1,
          lines: {
            create: [
              {
                productId: hardwareProduct.id,
                productNameSnapshot: hardwareProduct.name,
                categorySnapshot: hardwareProduct.category,
                quantity: 1,
                unitPrice: 3000.0,
                unitCost: 1000.0,
                discountPercent: 30.0,
                lineSubtotal: 3000.0,
                lineDiscountAmount: 900.0,
                lineMargin: 1100.0,
              },
            ],
          },
          approvalSteps: {
            create: [
              { stepOrder: 1, requiredRole: 'SALES_MANAGER', status: 'PENDING' },
              { stepOrder: 2, requiredRole: 'FINANCE', status: 'PENDING' },
            ],
          },
        },
        include: {
          approvalSteps: { orderBy: { stepOrder: 'asc' } },
        },
      });

      step1 = activeQuote.approvalSteps[0];
      step2 = activeQuote.approvalSteps[1];
    });

    it('should prevent Finance from approving Step 2 before Sales Manager approves Step 1', async () => {
      await expect(
        approvalService.actionApprovalStep({
          stepId: step2.id,
          action: 'APPROVED',
          actorUser: financeUser,
        })
      ).rejects.toThrow(/Cannot action step 2 \(FINANCE\) before step 1 \(SALES_MANAGER\) has been approved/);
    });

    it('should prevent Sales Representative from self-approving their own quotation', async () => {
      await expect(
        approvalService.actionApprovalStep({
          stepId: step1.id,
          action: 'APPROVED',
          actorUser: repUser, // Same as ownerRepId
        })
      ).rejects.toThrow(/Sales representatives are not permitted to approve/);
    });

    it('should require non-empty notes when returning or rejecting', async () => {
      await expect(
        approvalService.actionApprovalStep({
          stepId: step1.id,
          action: 'REJECTED',
          notes: '   ', // empty whitespace
          actorUser: managerUser,
        })
      ).rejects.toThrow(/non-empty reason is required when rejecting or returning/);

      await expect(
        approvalService.actionApprovalStep({
          stepId: step1.id,
          action: 'RETURNED',
          notes: '',
          actorUser: managerUser,
        })
      ).rejects.toThrow(/non-empty reason is required when rejecting or returning/);
    });

    it('should prevent double-decision on an already actioned step', async () => {
      // Action step 1 as approved
      await approvalService.actionApprovalStep({
        stepId: step1.id,
        action: 'APPROVED',
        notes: 'Looks acceptable',
        actorUser: managerUser,
      });

      // Attempt to action step 1 again
      await expect(
        approvalService.actionApprovalStep({
          stepId: step1.id,
          action: 'APPROVED',
          actorUser: managerUser,
        })
      ).rejects.toThrow(/step has already been actioned/);
    });

    it('should enforce optimistic concurrency locking (throws 409 CONCURRENCY_CONFLICT on stale version)', async () => {
      // Step 1 expects version 1, but we pass stale version 0
      await expect(
        approvalService.actionApprovalStep({
          stepId: step1.id,
          action: 'APPROVED',
          actorUser: managerUser,
          expectedVersion: 0, // Current is 1
        })
      ).rejects.toThrow(/Quotation was modified by another user/);
    });

    it('should execute full sequential chain: Step 1 (Manager) -> Step 2 (Finance) -> APPROVED', async () => {
      // Step 1: Sales Manager approves
      const res1 = await approvalService.actionApprovalStep({
        stepId: step1.id,
        action: 'APPROVED',
        notes: 'Manager approval granted',
        actorUser: managerUser,
        expectedVersion: 1,
      });

      expect(res1.step.status).toBe('APPROVED');
      expect(res1.quotation.status).toBe('PENDING_APPROVAL'); // Still waiting on Finance
      expect(res1.quotation.version).toBe(2);

      // Step 2: Finance approves
      const res2 = await approvalService.actionApprovalStep({
        stepId: step2.id,
        action: 'APPROVED',
        notes: 'Finance escalation approved',
        actorUser: financeUser,
        expectedVersion: 2,
      });

      expect(res2.step.status).toBe('APPROVED');
      expect(res2.quotation.status).toBe('APPROVED'); // All steps complete!
      expect(res2.quotation.version).toBe(3);

      // Verify AuditLog entries
      const logs = await prisma.auditLog.findMany({
        where: { quotationId: activeQuote.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs.some((l) => l.action === 'APPROVAL_STEP_APPROVED' && l.actorId === managerUser.id)).toBe(true);
      expect(logs.some((l) => l.action === 'APPROVAL_STEP_APPROVED' && l.actorId === financeUser.id)).toBe(true);
    });

    it('should transition quotation to RETURNED with reason notes', async () => {
      const res = await approvalService.actionApprovalStep({
        stepId: step1.id,
        action: 'RETURNED',
        notes: 'Please reduce discount to under 20%.',
        actorUser: managerUser,
      });

      expect(res.step.status).toBe('RETURNED');
      expect(res.quotation.status).toBe('RETURNED');

      const audit = await prisma.auditLog.findFirst({
        where: { quotationId: activeQuote.id, action: 'APPROVAL_STEP_RETURNED' },
      });
      expect(audit.reasonNote).toBe('Please reduce discount to under 20%.');
      expect(audit.afterStatus).toBe('RETURNED');
    });
  });

  describe('3. HTTP API Endpoints & Role Authorization Tests', () => {
    let apiQuote;
    let apiStep;

    beforeEach(async () => {
      apiQuote = await prisma.quotation.create({
        data: {
          quoteNumber: `API-TEST-${Date.now()}`,
          customerId: customerAcme.id,
          ownerRepId: repUser.id,
          status: 'DRAFT',
          lines: {
            create: [
              {
                productId: serviceProduct.id,
                productNameSnapshot: serviceProduct.name,
                categorySnapshot: serviceProduct.category,
                quantity: 1,
                unitPrice: 1000.0,
                unitCost: 300.0,
                discountPercent: 18.0, // 8 points over 10% Services limit
                lineSubtotal: 1000.0,
                lineDiscountAmount: 180.0,
                lineMargin: 520.0,
              },
            ],
          },
        },
      });
    });

    it('POST /api/quotations/:id/submit should submit quotation and generate approval step', async () => {
      const res = await request(app)
        .post(`/api/quotations/${apiQuote.id}/submit`)
        .set('Authorization', `Bearer ${repToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quotation.status).toBe('PENDING_APPROVAL');
      expect(res.body.data.riskResult.worstLineOverage).toBe(8.0);
      expect(res.body.data.approvalSteps).toHaveLength(1);
      expect(res.body.data.approvalSteps[0].requiredRole).toBe('SALES_MANAGER');

      apiStep = res.body.data.approvalSteps[0];
    });

    it('POST /api/approvals/steps/:id/action should reject action from user lacking required role (403)', async () => {
      // First submit
      await request(app)
        .post(`/api/quotations/${apiQuote.id}/submit`)
        .set('Authorization', `Bearer ${repToken}`)
        .send();

      const quoteWithSteps = await prisma.quotation.findUnique({
        where: { id: apiQuote.id },
        include: { approvalSteps: true },
      });
      const step = quoteWithSteps.approvalSteps[0];

      // Finance trying to action a SALES_MANAGER step
      const res = await request(app)
        .post(`/api/approvals/steps/${step.id}/action`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ action: 'APPROVED', notes: 'Unauthorized attempt' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_ROLE');
    });

    it('GET /api/quotations/:id/approval-status returns current state, flagged lines, and audit timeline', async () => {
      // Submit quote
      await request(app)
        .post(`/api/quotations/${apiQuote.id}/submit`)
        .set('Authorization', `Bearer ${repToken}`)
        .send();

      const res = await request(app)
        .get(`/api/quotations/${apiQuote.id}/approval-status`)
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.quotation.status).toBe('PENDING_APPROVAL');
      expect(res.body.data.riskEvaluation.flaggedLines).toHaveLength(1);
      expect(res.body.data.approvalSteps).toHaveLength(1);
      expect(res.body.data.auditTimeline.length).toBeGreaterThan(0);
    });
  });
});
