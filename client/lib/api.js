/**
 * Reusable API Client for DealFlow360
 * Configured to include HTTP-only credentials with all requests.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClientError extends Error {
  constructor(message, status = 500, code = 'NETWORK_ERROR', details = {}, requestId = null) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    // Required to send and receive secure HTTP-only cookies
    credentials: 'include',
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    let json = null;

    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (!response.ok) {
      const errorCode = json?.error?.code || 'HTTP_ERROR';
      const errorMessage = json?.error?.message || response.statusText || 'Request failed';
      const errorDetails = json?.error?.details || {};
      const requestId = json?.requestId || response.headers.get('x-request-id');

      throw new ApiClientError(errorMessage, response.status, errorCode, errorDetails, requestId);
    }

    return json;
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw new ApiClientError(err.message || 'Network request failed', 0, 'FETCH_FAILED', {}, null);
  }
}

export async function apiRequest(endpoint, options = {}) {
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token');
  }
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await request(endpoint, {
    ...options,
    headers,
  });
  return res && res.data !== undefined ? res.data : res;
}

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
};

export { ApiClientError, request };
export default api;

