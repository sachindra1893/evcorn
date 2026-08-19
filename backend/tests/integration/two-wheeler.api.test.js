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

  it('POST /api/categories allows authenticated admin to auto-create a new 2W brand', async () => {
    const brandId = `river-test-${Date.now()}`;
    const brandPayload = {
      id: brandId,
      name: 'River Mobility'
    };

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(brandPayload);

    expect([200, 201]).toContain(res.status);
    expect(res.body.name).toBe('River Mobility');
  });

  it('POST /api/vehicles saves a two-wheeler vehicle with 4 multi-angle photo URLs and vehicleType: "two-wheeler"', async () => {
    const photoUrls = [
      'https://res.cloudinary.com/evcorn/image/upload/v1787130001/two-wheelers/river-indie-front.jpg',
      'https://res.cloudinary.com/evcorn/image/upload/v1787130002/two-wheelers/river-indie-side.jpg',
      'https://res.cloudinary.com/evcorn/image/upload/v1787130003/two-wheelers/river-indie-rear.jpg',
      'https://res.cloudinary.com/evcorn/image/upload/v1787130004/two-wheelers/river-indie-dash.jpg'
    ];

    const payload = {
      name: 'River Indie::Standard',
      categoryId: 'ather',
      vehicleType: 'two-wheeler',
      parentModel: 'Indie',
      variantName: 'Standard',
      price: '₹1,38,000',
      range: '120 km',
      batteryCapacity: '4.0 kWh',
      bhp: '9.0 bhp',
      torque: '26 Nm',
      topSpeed: '90 km/h',
      acceleration0to40: '3.9s (0-40)',
      bootSpace: '43 L',
      wheelSize: '14-inch Alloys',
      imageUrl: photoUrls[0],
      galleryImages: photoUrls,
      keyHighlights: 'Pannier mounts, 43L under-seat storage, twin beam headlamps',
      status: 'Launched'
    };

    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.vehicleType).toBe('two-wheeler');
    expect(res.body.imageUrl).toBe(photoUrls[0]);
    expect(res.body.galleryImages).toHaveLength(4);
    expect(res.body.galleryImages).toEqual(photoUrls);
    expect(res.body.bootSpace).toContain('43 L');
    testBikeId = res.body.id || res.body._id;

    // Verify GET /api/vehicles/:id directly
    const getRes = await request(app).get(`/api/vehicles/${testBikeId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.vehicleType).toBe('two-wheeler');
    expect(getRes.body.imageUrl).toBe(photoUrls[0]);
    expect(getRes.body.galleryImages).toEqual(photoUrls);
    expect(getRes.body.bootSpace).toContain('43 L');
    expect(getRes.body.wheelSize).toBe('14-inch Alloys');
  });

  it('GET /api/vehicles?vehicleType=two-wheeler returns only two-wheelers with photos', async () => {
    const res = await request(app).get('/api/vehicles?vehicleType=two-wheeler');
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.data;
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
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

  it('GET /api/vehicles/compare allows comparing two two-wheelers', async () => {
    const res = await request(app)
      .get(`/api/vehicles/compare?ids=ather-450x-gen-3-pro,river-indie-standard&vehicleType=two-wheeler`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    res.body.forEach(v => {
      expect(v.vehicleType).toBe('two-wheeler');
    });
  });

  it('GET /api/vehicles/compare rejects mixing a car and a two-wheeler with 400 Bad Request', async () => {
    // Create a car test record first
    await vehicleService.saveVehicle({
      id: 'test-car-for-compare',
      name: 'Tata Nexon EV::Creative',
      categoryId: 'tata',
      vehicleType: 'car',
      price: '₹14.49 Lakh'
    });

    const res = await request(app)
      .get(`/api/vehicles/compare?ids=test-car-for-compare,river-indie-standard`);
    expect(res.status).toBe(400);
    const msg = res.body.error?.message || res.body.message || '';
    expect(msg).toContain('Cannot compare vehicles of different types');
  });

  it('GET /api/vehicles/compare rejects vehicleType mismatch with 400 Bad Request', async () => {
    const res = await request(app)
      .get(`/api/vehicles/compare?ids=test-car-for-compare&vehicleType=two-wheeler`);
    expect(res.status).toBe(400);
    const msg = res.body.error?.message || res.body.message || '';
    expect(msg).toContain('not a two-wheeler');
  });
});
