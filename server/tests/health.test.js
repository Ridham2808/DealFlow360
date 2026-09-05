const request = require('supertest');
const app = require('../app');

describe('GET /api/health', () => {
  it('should return 200 with healthy status and requestId', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.requestId).toBeDefined();
    expect(res.headers['x-request-id']).toBeDefined();
  });
});
