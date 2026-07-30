/**
 * Phase 7 — Security hardening integration checks.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../server');
const { matchesMagicBytes } = require('../../middlewares/upload.middleware');
const { sanitizeObject } = require('../../middlewares/sanitize.middleware');
const { getSystemMetrics } = require('../../middlewares/requestLogger.middleware');

describe('Phase 7 Security', () => {
  it('rejects unauthenticated vehicle create', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .send({ name: 'hacker-ev' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(JSON.stringify(res.body)).not.toMatch(/stack|at Object|node_modules/i);
  });

  it('does not leak stack traces on failed login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'definitely-wrong' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error.message).toBeDefined();
    expect(res.body.error.stack).toBeUndefined();
    expect(res.body.stack).toBeUndefined();
  });

  it('ignores article admin filter escalation on public list', async () => {
    const res = await request(app).get('/api/articles?admin=true&status=draft&limit=5');
    expect(res.statusCode).toBe(200);
    const items = Array.isArray(res.body) ? res.body : res.body.data || [];
    for (const item of items) {
      if (item.status) {
        expect(item.status).not.toBe('draft');
        expect(item.status).not.toBe('archived');
      }
    }
  });

  it('public metrics omit pid and nodeVersion', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.pid).toBeUndefined();
    expect(res.body.data.nodeVersion).toBeUndefined();

    const publicMetrics = getSystemMetrics({ public: true });
    expect(publicMetrics.pid).toBeUndefined();
    expect(publicMetrics.nodeVersion).toBeUndefined();
  });

  it('CORS denied origins do not become 500', async () => {
    const res = await request(app)
      .get('/api/health/live')
      .set('Origin', 'https://evil.example.com');

    // cors(callback null,false) → response succeeds without ACAO for that origin
    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.body.error).toBeUndefined();
  });

  it('rejects alg=none JWT forgery', async () => {
    const forged = jwt.sign({ role: 'admin' }, '', { algorithm: 'none' });
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${forged}`);

    expect(res.statusCode).toBe(401);
  });

  it('rejects legacy x-admin-password header (JWT-only auth)', async () => {
    const password = process.env.ADMIN_PASSWORD || 'admin';
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('x-admin-password', password);

    expect(res.statusCode).toBe(401);
  });

  it('accepts valid admin JWT on protected route', async () => {
    const { generateToken } = require('../../utils/auth.utils');
    const token = generateToken({ role: 'admin' });
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });

  it('analytics GETs are Cache-Control no-store', async () => {
    const { generateToken } = require('../../utils/auth.utils');
    const token = generateToken({ role: 'admin' });
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(String(res.headers['cache-control'] || '')).toMatch(/no-store/i);
  });

  it('sanitize strips $ and dotted keys', () => {
    const cleaned = sanitizeObject({
      title: 'ok',
      $gt: 1,
      'pricing.exShowroom': 9,
      nested: { $ne: null, keep: true }
    });
    expect(cleaned.title).toBe('ok');
    expect(cleaned.$gt).toBeUndefined();
    expect(cleaned['pricing.exShowroom']).toBeUndefined();
    expect(cleaned.nested.$ne).toBeUndefined();
    expect(cleaned.nested.keep).toBe(true);
  });

  it('magic-byte helper accepts JPEG and rejects spoofed PNG', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const textAsPng = Buffer.from('not-a-png-file!!!!!');
    expect(matchesMagicBytes(jpeg, 'image/jpeg')).toBe(true);
    expect(matchesMagicBytes(textAsPng, 'image/png')).toBe(false);
  });
});
