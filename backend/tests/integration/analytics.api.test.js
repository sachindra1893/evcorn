const request = require('supertest');
const app = require('../../server');

describe('Analytics & Business Intelligence API Integration Tests', () => {
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

  it('GET /api/analytics/overview should return business metrics overview', async () => {
    const res = await request(app).get('/api/analytics/overview');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBeDefined();
    expect(res.body.data.traffic).toBeDefined();
  });

  it('GET /api/analytics/top-content should return top articles and vehicle comparisons', async () => {
    const res = await request(app).get('/api/analytics/top-content');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.topArticles).toBeDefined();
  });

  it('GET /api/analytics/search-queries should return popular search term stats', async () => {
    const res = await request(app).get('/api/analytics/search-queries');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.popularSearches).toBeDefined();
  });
});
