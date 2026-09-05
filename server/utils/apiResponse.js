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

function success(data = null, message = null) {
  const res = { success: true };
  if (data !== null && data !== undefined) res.data = data;
  if (message) res.message = message;
  return res;
}

function error(message = 'An unexpected error occurred', statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

module.exports = {
  ApiError,
  sendSuccess,
  sendError,
  success,
  error,
};
