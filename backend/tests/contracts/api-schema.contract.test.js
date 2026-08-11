const request = require('supertest');
const app = require('../../server');

describe('EVCorn Production API Schema Contracts (Phase 8)', () => {

  test('Contract 1: GET /api/vehicles returns valid vehicle DTOs with mandatory fields', async () => {
    const res = await request(app).get('/api/vehicles');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      const v = res.body[0];
      expect(v).toHaveProperty('id');
      expect(typeof v.id).toBe('string');
      expect(v).toHaveProperty('name');
      expect(typeof v.name).toBe('string');
      expect(v).toHaveProperty('categoryId');
      expect(typeof v.categoryId).toBe('string');
      expect(v).toHaveProperty('imageUrl');
      expect(v).toHaveProperty('status');
      expect(['Launched', 'Upcoming']).toContain(v.status);
    }
  });

  test('Contract 2: GET /api/vehicles?light=true returns lightweight DTOs with key fields', async () => {
    const res = await request(app).get('/api/vehicles?light=true');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      const v = res.body[0];
      expect(v).toHaveProperty('id');
      expect(v).toHaveProperty('name');
      expect(v).toHaveProperty('categoryId');
      expect(v).toHaveProperty('imageUrl');
      expect(v).toHaveProperty('parentModel');
    }
  });

  test('Contract 3: GET /api/articles?light=true returns article list without heavy body content', async () => {
    const res = await request(app).get('/api/articles?light=true');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      const a = res.body[0];
      expect(a).toHaveProperty('id');
      expect(a).toHaveProperty('title');
      expect(a).toHaveProperty('active');
      expect(typeof a.active).toBe('boolean');
      expect(a).toHaveProperty('categoryId');
    }
  });

  test('Contract 4: GET /api/categories returns category DTOs with valid logoUrl', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      const c = res.body[0];
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('logoUrl');
      expect(c).toHaveProperty('logo');
      expect(c.logo).toBe(c.logoUrl);
    }
  });

  test('Contract 5: GET /api/vehicles/:id handles non-existent and invalid IDs with 404', async () => {
    const resNonExistent = await request(app).get('/api/vehicles/non-existent-vehicle-slug-999');
    expect(resNonExistent.statusCode).toBe(404);
    expect(resNonExistent.body.success).toBe(false);
    expect(resNonExistent.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  test('Contract 6: GET /api/articles/:id handles invalid ObjectId without throwing 500 CastError', async () => {
    const resInvalidId = await request(app).get('/api/articles/invalid-not-an-object-id');
    expect(resInvalidId.statusCode).toBe(404);
    expect(resInvalidId.body.success).toBe(false);
    expect(resInvalidId.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  test('Contract 7: GET /api/search/unified returns expected unified search contract schema', async () => {
    const res = await request(app).get('/api/search/unified?q=tata');
    if (res.statusCode !== 200) console.log(res.body);
    expect(res.statusCode).toBe(200);
    const data = res.body.data || res.body;
    expect(data).toHaveProperty('query', 'tata');
    expect(data).toHaveProperty('totalResults');
    expect(typeof data.totalResults).toBe('number');
    expect(Array.isArray(data.vehicles)).toBe(true);
    expect(Array.isArray(data.articles)).toBe(true);
  });

  test('Contract 8: All vehicles returned by GET /api/vehicles have non-empty required fields', async () => {
    const res = await request(app).get('/api/vehicles');
    expect(res.statusCode).toBe(200);
    
    for (const v of res.body) {
      expect(v.id).toBeTruthy();
      expect(v.name).toBeTruthy();
      expect(v.categoryId).toBeTruthy();
      expect(v.imageUrl).toBeDefined();
    }
  });
});
