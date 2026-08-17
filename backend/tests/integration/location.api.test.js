/**
 * Location API Integration Test Suite
 */
const request = require('supertest');
const app = require('../../server');

describe('Location API Endpoint GET /api/location/detect', () => {
  it('returns clean city-level IP geolocation without colony/society names', async () => {
    const res = await request(app)
      .get('/api/location/detect')
      .set('X-Forwarded-For', '103.25.194.1'); // Real Indian public IP (Delhi/Noida region)

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.city).toBeDefined();
    expect(typeof res.body.city).toBe('string');
    expect(res.body.city.length).toBeGreaterThan(1);
    
    // Must be clean city name (no colony/society/locality names)
    expect(res.body.city).not.toMatch(/sector|society|colony|mohalla|nagar/i);
  });
});
