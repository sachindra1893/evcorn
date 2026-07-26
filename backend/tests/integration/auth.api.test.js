const request = require('supertest');
const app = require('../../server');

describe('Auth API Integration Tests', () => {
  it('POST /api/auth/login with valid password should return JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: process.env.ADMIN_PASSWORD || 'admin' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.headers['cache-control']).toContain('no-store');
  });

  it('POST /api/auth/login with invalid password should return 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'wrong_password_123' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED_ACCESS');
  });
});
