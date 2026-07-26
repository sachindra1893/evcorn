const request = require('supertest');
const app = require('../../server');
const { generateToken } = require('../../utils/auth.utils');

describe('Admin Operations API Integration Tests', () => {
  let adminToken;

  beforeAll(() => {
    adminToken = generateToken({ role: 'admin' });
  });

  it('GET /api/admin/dashboard should return operational metrics', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics).toBeDefined();
    expect(res.body.data.systemHealth).toBeDefined();
  });

  it('POST /api/admin/bulk should execute bulk operations for authorized admin', async () => {
    const res = await request(app)
      .post('/api/admin/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'bulk_publish',
        ids: ['dummy-id-1', 'dummy-id-2']
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.processedCount).toBe(2);
  });

  it('GET /api/admin/export should export data in JSON format', async () => {
    const res = await request(app)
      .get('/api/admin/export?entity=articles')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/admin/activity should return activity log stream', async () => {
    const res = await request(app)
      .get('/api/admin/activity')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/admin/media should return Cloudinary media asset library', async () => {
    const res = await request(app)
      .get('/api/admin/media')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
