/**
 * Permanent regression: Server-Timing header + request-id observability (Phase 2).
 */
const request = require('supertest');
const app = require('../../server');
const perf = require('../../utils/perf');

describe('Observability regressions — Server-Timing & request correlation', () => {
  it('GET /api/articles/:id sets Server-Timing from the request perf trace', async () => {
    const list = await request(app).get('/api/articles');
    expect(list.statusCode).toBe(200);
    const articles = Array.isArray(list.body) ? list.body : list.body?.data || [];
    expect(articles.length).toBeGreaterThan(0);
    const id = articles[0].id;

    const res = await request(app)
      .get(`/api/articles/${id}`)
      .set('x-request-id', 'server-timing-regression');

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-request-id']).toBe('server-timing-regression');

    // Article detail controller attaches Server-Timing via perf.buildServerTimingHeader().
    const timing = res.headers['server-timing'];
    expect(timing).toBeDefined();
    expect(String(timing)).toMatch(/total;dur=/);
  });

  it('perf.buildServerTimingHeader formats mark deltas and total', () => {
    perf.startTrace();
    perf.mark('controller_entry');
    perf.mark('controller_after_service');
    const header = perf.buildServerTimingHeader();
    expect(header).toBeTruthy();
    expect(header).toMatch(/controller_entry;dur=/);
    expect(header).toMatch(/controller_after_service;dur=/);
    expect(header).toMatch(/total;dur=/);
  });

  it('CORS exposes x-request-id and Server-Timing for browser clients', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:4200')
      .set('Access-Control-Request-Method', 'GET');

    // preflight may be 204/200 depending on cors config
    expect([200, 204]).toContain(res.statusCode);
    const exposed = String(res.headers['access-control-expose-headers'] || '').toLowerCase();
    // If expose headers are only on actual responses, fall back to a real GET check:
    if (!exposed.includes('server-timing')) {
      const getRes = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:4200');
      const exposedGet = String(getRes.headers['access-control-expose-headers'] || '').toLowerCase();
      expect(exposedGet).toMatch(/x-request-id/);
      expect(exposedGet).toMatch(/server-timing/);
    } else {
      expect(exposed).toMatch(/x-request-id/);
      expect(exposed).toMatch(/server-timing/);
    }
  });
});

describe('Retry utility regressions', () => {
  const { withRetry } = require('../../utils/retry.utils');

  it('exhausts retries and rethrows after persistent failure', async () => {
    let attempts = 0;
    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new Error('always-fail');
        },
        { retries: 2, delayMs: 5 }
      )
    ).rejects.toThrow('always-fail');
    expect(attempts).toBe(2);
  });
});
