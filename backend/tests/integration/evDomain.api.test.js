const request = require('supertest');
const app = require('../../server');

describe('EV Domain Intelligence API Integration Tests', () => {
  it('POST /api/domain/score should return explainable EV scores', async () => {
    const res = await request(app)
      .post('/api/domain/score')
      .send({
        batteryCapacity: 40.5,
        range: 453,
        priceLakh: 14.49
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.overallScore).toBeDefined();
    expect(res.body.data.explanation).toBeDefined();
  });

  it('POST /api/domain/tco should calculate total cost of ownership and savings', async () => {
    const res = await request(app)
      .post('/api/domain/tco')
      .send({
        priceLakh: 15,
        annualKm: 15000,
        ownershipYears: 5
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.costPerKmEV).toBeDefined();
    expect(res.body.data.estimatedIceSavingsINR).toBeGreaterThan(0);
  });

  it('POST /api/domain/charging-cost should calculate charging cost and duration', async () => {
    const res = await request(app)
      .post('/api/domain/charging-cost')
      .send({
        batteryCapacityKWh: 40.5,
        currentSocPct: 10,
        targetSocPct: 80,
        chargerKW: 50
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCostINR).toBeDefined();
    expect(res.body.data.chargingDurationFormatted).toBeDefined();
  });

  it('POST /api/domain/real-range should estimate usable real-world range', async () => {
    const res = await request(app)
      .post('/api/domain/real-range')
      .send({
        claimedRange: 453,
        drivingMode: 'highway',
        acOn: true
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estimatedRealRangeKm).toBeLessThan(453);
  });

  it('POST /api/domain/compatibility should verify charging plug compatibility', async () => {
    const res = await request(app)
      .post('/api/domain/compatibility')
      .send({
        vehicleConnector: 'CCS2',
        chargerConnector: 'CCS2',
        chargerKW: 60
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('COMPATIBLE');
  });

  it('POST /api/domain/smart-recommendations should return ranked recommendations with explanations', async () => {
    const res = await request(app)
      .post('/api/domain/smart-recommendations')
      .send({
        budgetMaxLakh: 20,
        priority: 'city_commute'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
