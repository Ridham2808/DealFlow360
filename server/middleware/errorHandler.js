const { ApiError, sendError } = require('../utils/apiResponse');

/**
 * Centralized error handling middleware.
 * Ensures consistent JSON response across the entire application.
 */
function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  const requestId = req.id || 'unknown';

  if (err instanceof ApiError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  // Handle syntax/JSON parse errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 400, 'MALFORMED_JSON', 'Malformed JSON payload provided in request body');
  }

  // Handle Prisma known errors
  if (err.code && err.code.startsWith('P')) {
    if (err.code === 'P2002') {
      const target = err.meta?.target || 'field';
      return sendError(res, 409, 'UNIQUE_CONSTRAINT_VIOLATION', `A record with this ${target} already exists.`, { target });
    }
    if (err.code === 'P2025') {
      return sendError(res, 404, 'RECORD_NOT_FOUND', 'The requested record was not found.');
    }
  }

  // Unhandled error fallback
  console.error(`[Error] [Request ${requestId}]`, err);
  const isDev = process.env.NODE_ENV !== 'production';
  return sendError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    isDev ? err.message : 'An internal server error occurred',
    isDev ? { stack: err.stack } : {}
  );
}

module.exports = errorHandler;
