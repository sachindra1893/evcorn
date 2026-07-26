const request = require('supertest');
const app = require('../../server');

describe('Vehicle API Integration Tests', () => {
  it('GET /api/vehicles should return vehicle catalog list with Cache-Control headers', async () => {
    const res = await request(app).get('/api/vehicles');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.headers['cache-control']).toContain('public');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /api/vehicles?format=envelope should return standardized envelope format', async () => {
    const res = await request(app).get('/api/vehicles?format=envelope');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/vehicles/:id for non-existent vehicle should return 404 AppError', async () => {
    const res = await request(app).get('/api/vehicles/non-existent-vehicle-id-12345');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.requestId).toBeDefined();
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });
});
