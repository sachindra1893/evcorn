const request = require('supertest');
const app = require('../../server');
const { generateToken } = require('../../utils/auth.utils');

describe('Analytics & Business Intelligence API Integration Tests', () => {
  let adminToken;

  beforeAll(() => {
    adminToken = generateToken({ role: 'admin' });
  });

  it('POST /api/analytics/event should record event payload successfully', async () => {
    const res = await request(app)
      .post('/api/analytics/event')
      .send({
        eventName: 'page_view',
        pageUrl: '/compare',
        deviceType: 'desktop'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/analytics/overview without auth should return 401 (Phase 7)', async () => {
    const res = await request(app).get('/api/analytics/overview');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/analytics/overview with admin JWT should return business metrics', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBeDefined();
    expect(res.body.data.traffic).toBeDefined();
  });

  it('GET /api/analytics/top-content without auth should return 401 (Phase 7)', async () => {
    const res = await request(app).get('/api/analytics/top-content');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/analytics/top-content with admin JWT should return top content', async () => {
    const res = await request(app)
      .get('/api/analytics/top-content')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.topArticles).toBeDefined();
  });

  it('GET /api/analytics/search-queries without auth should return 401 (Phase 7)', async () => {
    const res = await request(app).get('/api/analytics/search-queries');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/analytics/search-queries with admin JWT should return search stats', async () => {
    const res = await request(app)
      .get('/api/analytics/search-queries')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.popularSearches).toBeDefined();
  });
});
