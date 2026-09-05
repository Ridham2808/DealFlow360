const request = require('supertest');
const bcrypt = require('bcryptjs');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = require('../app');
const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole, requireInternalUser, requireCustomer } = require('../middleware/roleMiddleware');
const { generateToken, COOKIE_NAME } = require('../utils/tokenHelper');

// Mock userRepository for isolated unit/integration testing without requiring live PostgreSQL during test run
jest.mock('../repositories/userRepository');

describe('DealFlow360 Authentication & Security Test Suite', () => {
  const mockPassword = 'Password123!';
  let mockPasswordHash;
  let mockInternalUser;
  let mockCustomerUser;

  beforeAll(async () => {
    mockPasswordHash = await bcrypt.hash(mockPassword, 10);
    mockInternalUser = {
      id: 'user-sales-rep-001',
      name: 'Elena Rostova',
      email: 'rep@dealflow360.com',
      passwordHash: mockPasswordHash,
      role: 'SALES_REP',
      customerTier: null,
      customerId: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCustomerUser = {
      id: 'user-customer-001',
      name: 'Sarah Connor',
      email: 'customer@acmecorp.com',
      passwordHash: mockPasswordHash,
      role: 'CUSTOMER',
      customerTier: 'GOLD',
      customerId: 'cust-acme-001',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Password Hashing', () => {
    it('should hash passwords with bcrypt correctly', async () => {
      const hash = await bcrypt.hash('Secret123!', 10);
      expect(hash).not.toEqual('Secret123!');
      const match = await bcrypt.compare('Secret123!', hash);
      expect(match).toBe(true);
      const wrong = await bcrypt.compare('WrongPass', hash);
      expect(wrong).toBe(false);
    });
  });

  describe('2. Login Success & Cookie Issuance', () => {
    it('should authenticate valid user and issue a secure httpOnly cookie', async () => {
      userRepository.findByEmail.mockResolvedValue(mockInternalUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'rep@dealflow360.com', password: mockPassword });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('rep@dealflow360.com');
      expect(res.body.data.user.role).toBe('SALES_REP');
      expect(res.body.data.token).toBeDefined();

      // Verify Set-Cookie header contains dealflow_token and HttpOnly
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const authCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');
      expect(authCookie).toContain('Path=/');
    });
  });

  describe('3. Invalid Credentials Security Behavior', () => {
    it('should return identical generic error for non-existent email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@company.com', password: 'Password123!' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password.');
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return identical generic error for incorrect password', async () => {
      userRepository.findByEmail.mockResolvedValue(mockInternalUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'rep@dealflow360.com', password: 'WrongPassword999!' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password.');
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('4. Public Signup Disabled Enforcement', () => {
    it('should reject direct signup attempts with 403 PUBLIC_SIGNUP_DISABLED', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Unauthorized User',
          email: 'random@dealflow360.com',
          password: 'Password123!',
          role: 'SALES_REP',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PUBLIC_SIGNUP_DISABLED');
    });
  });

  describe('5. Logout', () => {
    it('should clear the authentication cookie upon logout', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const clearedCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=;`));
      expect(clearedCookie).toBeDefined();
    });
  });

  describe('6. Protected Routes, Missing JWT, and Invalid JWT', () => {
    it('should reject access with 401 when JWT cookie/header is missing', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject access with 401 when JWT is malformed or invalid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`${COOKIE_NAME}=invalid_token_payload`]);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TOKEN_INVALID');
    });
  });

  describe('7. RBAC & Customer / Internal Route Separation', () => {
    let testApp;

    beforeAll(() => {
      testApp = express();
      testApp.use(cookieParser());
      testApp.use(express.json());

      // Protected internal route
      testApp.get('/internal-dashboard', requireAuth, requireInternalUser, (req, res) => {
        res.json({ success: true, message: 'Welcome internal employee' });
      });

      // Protected customer portal route
      testApp.get('/customer-portal', requireAuth, requireCustomer, (req, res) => {
        res.json({ success: true, message: 'Welcome customer' });
      });

      // Protected admin-only route
      testApp.get('/admin-audit', requireAuth, requireRole(['ADMIN']), (req, res) => {
        res.json({ success: true, message: 'Admin audit access granted' });
      });

      // Centralized error handler
      testApp.use((err, req, res, next) => {
        res.status(err.statusCode || 500).json({
          success: false,
          error: { code: err.code || 'ERROR', message: err.message },
        });
      });
    });

    it('should allow internal user to access internal dashboard', async () => {
      userRepository.findById.mockResolvedValue(mockInternalUser);
      const token = generateToken({ userId: mockInternalUser.id, role: mockInternalUser.role });

      const res = await request(testApp)
        .get('/internal-dashboard')
        .set('Cookie', [`${COOKIE_NAME}=${token}`]);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should BLOCK customer from accessing internal dashboard with 403', async () => {
      userRepository.findById.mockResolvedValue(mockCustomerUser);
      const token = generateToken({ userId: mockCustomerUser.id, role: mockCustomerUser.role });

      const res = await request(testApp)
        .get('/internal-dashboard')
        .set('Cookie', [`${COOKIE_NAME}=${token}`]);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_ONLY');
    });

    it('should allow customer to access customer portal', async () => {
      userRepository.findById.mockResolvedValue(mockCustomerUser);
      const token = generateToken({ userId: mockCustomerUser.id, role: mockCustomerUser.role });

      const res = await request(testApp)
        .get('/customer-portal')
        .set('Cookie', [`${COOKIE_NAME}=${token}`]);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should BLOCK sales rep from accessing admin-only endpoint with 403', async () => {
      userRepository.findById.mockResolvedValue(mockInternalUser);
      const token = generateToken({ userId: mockInternalUser.id, role: mockInternalUser.role });

      const res = await request(testApp)
        .get('/admin-audit')
        .set('Cookie', [`${COOKIE_NAME}=${token}`]);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
