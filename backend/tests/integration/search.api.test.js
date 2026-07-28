const request = require('supertest');
const app = require('../../server');

describe('Search & Recommendation API Integration Tests', () => {
  it('GET /api/search/unified should return search results across vehicles and articles', async () => {
    const res = await request(app).get('/api/search/unified?q=nexon');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vehicles).toBeDefined();
    expect(res.body.data.articles).toBeDefined();
  });

  it('GET /api/search/autocomplete should return capped suggestions', async () => {
    const res = await request(app).get('/api/search/autocomplete?q=tat');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(8);
  });

  it('GET /api/search/recommendations should return related content recommendations', async () => {
    const res = await request(app).get('/api/search/recommendations?categoryId=tata');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recommendedVehicles).toBeDefined();
    expect(res.body.data.recommendedArticles).toBeDefined();
  });

  it('GET /api/search/trending should return trending searches and content', async () => {
    const res = await request(app).get('/api/search/trending');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.popularSearches).toBeDefined();
  });

  it('GET /api/search/trending should return actual trending vehicles when vehicles exist (Root-Cause Cluster D regression)', async () => {
    // Regression test: getRelatedVehicles(null, null) used to always return []
    // because categoryMatch/brandMatch can never be true without a reference
    // vehicle/category. Seed data has vehicles, so this must be non-empty.
    const res = await request(app).get('/api/search/trending');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.trendingVehicles)).toBe(true);
    expect(res.body.data.trendingVehicles.length).toBeGreaterThan(0);
  });
});
