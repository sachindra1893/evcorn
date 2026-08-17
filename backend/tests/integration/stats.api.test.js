/**
 * Usage Stats Summary API Integration Test Suite
 */
const request = require('supertest');
const app = require('../../server');
const { logEvent, _clearTestEvents } = require('../../utils/eventLogger');
const cache = require('../../utils/cache');

describe('Usage Stats API (/api/stats/summary)', () => {
  beforeEach(() => {
    _clearTestEvents();
    cache.del(cache.KEYS.STATS_SUMMARY());
  });

  it('returns initial counts and updates after events are logged', async () => {
    // 1. Initial GET
    const res1 = await request(app).get('/api/stats/summary');
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data).toBeDefined();
    expect(typeof res1.body.data.comparisons).toBe('number');
    expect(typeof res1.body.data.calculatorUses).toBe('number');
    expect(typeof res1.body.data.vehiclesViewed).toBe('number');

    // 2. Clear cache and log events
    cache.del(cache.KEYS.STATS_SUMMARY());
    logEvent('compare_started');
    logEvent('compare_started');
    logEvent('calculator_used');
    logEvent('vehicle_viewed');

    // 3. Subsequent GET returns updated count
    const res2 = await request(app).get('/api/stats/summary');
    expect(res2.status).toBe(200);
    expect(res2.body.data.comparisons).toBe(2);
    expect(res2.body.data.calculatorUses).toBe(1);
    expect(res2.body.data.vehiclesViewed).toBe(1);
  });
});
