const request = require('supertest');
const app = require('../app');
const prisma = require('../prisma/prisma');
const authService = require('../services/authService');
const emailService = require('../services/emailService');

// Mock email service to verify delivery triggers without network latency
jest.mock('../services/emailService', () => ({
  sendInternalUserInvitation: jest.fn().mockResolvedValue({ success: true, messageId: 'mock-int-msg-id' }),
  sendCustomerPortalInvitation: jest.fn().mockResolvedValue({ success: true, messageId: 'mock-cust-msg-id' }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'mock-reset-msg-id' }),
}));

describe('Admin Users & Customers Management & Invitation Flow', () => {
  let adminToken;
  let repToken;
  let adminUser;

  beforeAll(async () => {
    // Generate valid tokens using authService helper
    adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const repUser = await prisma.user.findFirst({ where: { role: 'SALES_REP' } });

    const { token: aTok } = await authService.login(adminUser.email, 'Password123!');
    adminToken = aTok;

    if (repUser) {
      const { token: rTok } = await authService.login(repUser.email, 'Password123!');
      repToken = rTok;
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('allows ADMIN to list internal users', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Cookie', `dealflow_token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.users.length).toBeGreaterThan(0);
      // None should be CUSTOMER role
      res.body.data.users.forEach((u) => {
        expect(u.role).not.toBe('CUSTOMER');
      });
    });

    it('rejects non-admin role with 403', async () => {
      if (!repToken) return;
      const res = await request(app)
        .get('/api/admin/users')
        .set('Cookie', `dealflow_token=${repToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/admin/users (Create Internal User & Send Invite)', () => {
    const testEmail = `test.member.${Date.now()}@dealflow.io`;
    let createdUserId;
    let inviteRawToken;

    afterAll(async () => {
      // Clean up test user & invitation
      if (createdUserId) {
        await prisma.invitation.deleteMany({ where: { email: testEmail } }).catch(() => {});
        await prisma.user.deleteMany({ where: { email: testEmail } }).catch(() => {});
      }
    });

    it('creates an internal user in INVITATION_PENDING status and dispatches email', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Cookie', `dealflow_token=${adminToken}`)
        .send({
          name: 'Aman Sharma',
          email: testEmail,
          role: 'SALES_REP',
          team: 'Sales Operations',
          sendInvite: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.user.status).toBe('INVITATION_PENDING');
      expect(res.body.data.rawToken).toBeDefined();

      createdUserId = res.body.data.user.id;
      inviteRawToken = res.body.data.rawToken;

      expect(emailService.sendInternalUserInvitation).toHaveBeenCalledTimes(1);
      expect(emailService.sendInternalUserInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testEmail,
          name: 'Aman Sharma',
          role: 'SALES_REP',
          rawToken: inviteRawToken,
        })
      );
    });

    it('rejects duplicate email creation with 409', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Cookie', `dealflow_token=${adminToken}`)
        .send({
          name: 'Duplicate User',
          email: testEmail,
          role: 'SALES_MANAGER',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('validates invitation token through public auth endpoint', async () => {
      const res = await request(app)
        .post('/api/auth/invitation/validate')
        .send({ token: inviteRawToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invitation.email).toBe(testEmail);
      expect(res.body.data.invitation.role).toBe('SALES_REP');
    });
  });

  describe('Last Active Admin Protection', () => {
    it('prevents deactivating the last active ADMIN', async () => {
      // Find all admins
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
      });

      // If only 1 admin, deactivating that admin should fail with 409
      if (admins.length === 1) {
        const res = await request(app)
          .post(`/api/admin/users/${admins[0].id}/deactivate`)
          .set('Cookie', `dealflow_token=${adminToken}`);

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('LAST_ADMIN_GUARD');
      }
    });
  });

  describe('Customer Management & Portal Invitations', () => {
    const custEmail = `acme.corp.${Date.now()}@enterprise.com`;
    let createdCustId;

    afterAll(async () => {
      if (createdCustId) {
        await prisma.invitation.deleteMany({ where: { email: custEmail } }).catch(() => {});
        await prisma.user.deleteMany({ where: { email: custEmail } }).catch(() => {});
        await prisma.customer.deleteMany({ where: { email: custEmail } }).catch(() => {});
      }
    });

    it('creates a customer company and sends portal invite to contact', async () => {
      const res = await request(app)
        .post('/api/admin/customers')
        .set('Cookie', `dealflow_token=${adminToken}`)
        .send({
          name: 'Acme International',
          email: custEmail,
          tier: 'GOLD',
          contactName: 'Neha Sharma',
          contactEmail: custEmail,
          sendPortalInvite: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customer.name).toBe('Acme International');
      expect(res.body.data.customer.tier).toBe('GOLD');
      expect(res.body.data.customer.portalInvite).toBeDefined();

      createdCustId = res.body.data.customer.id;

      expect(emailService.sendCustomerPortalInvitation).toHaveBeenCalledTimes(1);
      expect(emailService.sendCustomerPortalInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          to: custEmail,
          companyName: 'Acme International',
          contactName: 'Neha Sharma',
        })
      );
    });
  });
});
