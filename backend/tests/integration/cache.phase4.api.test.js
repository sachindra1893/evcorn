/**
 * Phase 4 — category list caching (hit path does not break contract)
 */
const request = require('supertest');
const app = require('../../server');

describe('Phase 4 category cache', () => {
  it('GET /api/categories returns identical payload on successive hits', async () => {
    const a = await request(app).get('/api/categories');
    const b = await request(app).get('/api/categories');
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);
    expect(b.body).toEqual(a.body);
  });
});
