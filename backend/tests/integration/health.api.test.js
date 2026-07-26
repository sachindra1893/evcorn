const request = require('supertest');
const app = require('../../server');

describe('Health & Observability API Integration Tests', () => {
  it('GET /api/health should return status UP and system metrics', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.metrics).toBeDefined();
    expect(res.body.metrics.totalRequests).toBeGreaterThanOrEqual(1);
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /api/health/live should return HTTP 200 liveness probe', async () => {
    const res = await request(app).get('/api/health/live');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  it('GET /api/health/ready should return HTTP 200 readiness probe', async () => {
    const res = await request(app).get('/api/health/ready');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('READY');
  });

  it('GET /api/metrics should return aggregated telemetry', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.memory).toBeDefined();
  });
});
