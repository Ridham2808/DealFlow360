require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const requestIdMiddleware = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const { sendError } = require('./utils/apiResponse');

const app = express();

// Security Headers
app.use(helmet());

// Correlation / Request ID Middleware
app.use(requestIdMiddleware);

// Scoped CORS configuration with credentials enabled
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: clientOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['Content-Disposition']
}));


// HTTP Logging with Morgan (format includes Request ID)
morgan.token('req-id', (req) => req.id || '-');
app.use(morgan(':req-id :method :url :status :res[content-length] - :response-time ms'));

// Body Parsing & Cookie Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const adminRoutes = require('./routes/adminRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const fulfillmentRoutes = require('./routes/fulfillmentRoutes');
const billingRoutes = require('./routes/billingRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const dealHealthRoutes = require('./routes/dealHealthRoutes');
const portalRoutes = require('./routes/portalRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Base API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', approvalRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/fulfillment', fulfillmentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api', billingRoutes); // Exposes /api/subscriptions
app.use('/api/invoices', invoiceRoutes);
app.use('/api/deal-health', dealHealthRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/reports', reportRoutes);


// Placeholder index route
app.get('/', (req, res) => {
  res.json({
    name: 'DealFlow360 API',
    description: 'Intelligent, Self-Governing Sales Operations Platform',
    version: '1.0.0',
    docs: '/api/health'
  });
});

// 404 Handler
app.use((req, res) => {
  return sendError(res, 404, 'NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`);
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
