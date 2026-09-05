const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to assign or forward a unique Correlation / Request ID.
 */
function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  const requestId = incomingId || uuidv4();
  
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

module.exports = requestIdMiddleware;
