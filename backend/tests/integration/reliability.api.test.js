const request = require('supertest');
const app = require('../../server');
const { getFeatureFlags, isFeatureEnabled } = require('../../config/featureFlags');
const { withRetry } = require('../../utils/retry.utils');

describe('Reliability, Maintenance & Resilience Tests', () => {
  it('Feature Flags should export expected default flags', () => {
    const flags = getFeatureFlags();
    expect(flags.ENABLE_ADVANCED_SEARCH).toBe(true);
    expect(flags.ENABLE_EDITORIAL_WORKFLOW).toBe(true);
  });

  it('withRetry utility should retry failed async calls up to specified limit', async () => {
    let attempts = 0;
    const failingFn = async () => {
      attempts++;
      if (attempts < 2) throw new Error('Transient error');
      return 'success';
    };

    const result = await withRetry(failingFn, { retries: 3, delayMs: 10 });
    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  it('Maintenance Mode should return HTTP 503 when MAINTENANCE_MODE=true', async () => {
    process.env.MAINTENANCE_MODE = 'true';

    const res = await request(app).get('/api/vehicles');
    expect(res.statusCode).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_MAINTENANCE');
    expect(res.body.requestId).toBeDefined();
    expect(res.body.requestId).not.toBe('N/A');

    // Health endpoints bypass maintenance
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.statusCode).toBe(200);

    // Reset maintenance mode flag
    delete process.env.MAINTENANCE_MODE;
  });

  it('Unmatched /api routes should return JSON 404 with requestId', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.requestId).toBeDefined();
    expect(res.body.requestId).not.toBe('N/A');
  });
});
