const express = require('express');
const router = express.Router();
const { sendSuccess } = require('../utils/apiResponse');

router.get('/health', (req, res) => {
  return sendSuccess(res, {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'DealFlow360 API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  }, 200, 'DealFlow360 API is healthy');
});

module.exports = router;
