/**
 * Phase 4 — ETag / conditional GET middleware
 */
const request = require('supertest');
const app = require('../../server');

describe('Phase 4 ETag conditional requests', () => {
  it('GET /api/categories returns ETag and honors If-None-Match with 304', async () => {
    const first = await request(app).get('/api/categories');
    expect(first.statusCode).toBe(200);
    const etag = first.headers.etag;
    expect(etag).toBeDefined();

    const second = await request(app)
      .get('/api/categories')
      .set('If-None-Match', etag);
    expect(second.statusCode).toBe(304);
  });

  it('GET /api/vehicles?light=true returns ETag for public cacheable responses', async () => {
    const res = await request(app).get('/api/vehicles?light=true');
    expect(res.statusCode).toBe(200);
    expect(res.headers.etag).toBeDefined();
    expect(res.headers['cache-control']).toContain('public');
  });
});
