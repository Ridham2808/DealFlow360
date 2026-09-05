/**
 * Standard API response helper utilities.
 */

class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function sendSuccess(res, data = {}, statusCode = 200, message = null) {
  const response = {
    success: true,
    data,
    requestId: res.req ? res.req.id : undefined,
  };
  if (message) {
    response.message = message;
  }
  return res.status(statusCode).json(response);
}

function sendError(res, statusCode = 500, code = 'INTERNAL_ERROR', message = 'An unexpected error occurred', details = {}) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    requestId: res.req ? res.req.id : undefined,
  });
}

module.exports = {
  ApiError,
  sendSuccess,
  sendError,
};
