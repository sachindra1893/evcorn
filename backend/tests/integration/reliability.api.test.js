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

    // Health endpoints bypass maintenance
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.statusCode).toBe(200);

    // Reset maintenance mode flag
    delete process.env.MAINTENANCE_MODE;
  });
});
