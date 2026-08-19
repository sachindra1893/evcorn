const request = require('supertest');
const app = require('../../server');
const vehicleService = require('../../services/vehicle.service');
const { generateToken } = require('../../utils/auth.utils');

describe('Two-Wheeler Vertical API Integration Tests', () => {
  let adminToken;
  let testBikeId;

  beforeAll(async () => {
    adminToken = generateToken({ role: 'admin' });
  });

  afterAll(async () => {
    if (testBikeId) {
      try {
        await vehicleService.deleteVehicle(testBikeId);
      } catch (e) {
        // ignore cleanup error
      }
    }
  });

  it('POST /api/vehicles saves a two-wheeler vehicle with vehicleType: "two-wheeler"', async () => {
    const payload = {
      name: 'Ather 450X::Gen 3 Pro',
      categoryId: 'ather',
      vehicleType: 'two-wheeler',
      parentModel: '450X',
      variantName: 'Gen 3 Pro',
      price: '₹1,45,000',
      range: '150 km',
      batteryCapacity: '3.7 kWh',
      bhp: '8.6 bhp',
      torque: '26 Nm',
      topSpeed: '90 km/h',
      acceleration0to40: '3.3s (0-40)',
      bootSpace: '22 L',
      wheelSize: '12-inch Alloys',
      status: 'Launched'
    };

    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.vehicleType).toBe('two-wheeler');
    testBikeId = res.body.id || res.body._id;
  });

  it('GET /api/vehicles?vehicleType=two-wheeler returns only two-wheelers', async () => {
    const res = await request(app).get('/api/vehicles?vehicleType=two-wheeler');
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.data;
    expect(Array.isArray(list)).toBe(true);
    list.forEach(item => {
      expect(item.vehicleType).toBe('two-wheeler');
    });
  });

  it('GET /api/vehicles?vehicleType=car does NOT include two-wheelers', async () => {
    const res = await request(app).get('/api/vehicles?vehicleType=car');
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.data;
    expect(Array.isArray(list)).toBe(true);
    list.forEach(item => {
      expect(item.vehicleType).not.toBe('two-wheeler');
    });
  });
});
