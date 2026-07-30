/**
 * Article create vs update — edit must preserve id (no duplicate create).
 */
const request = require('supertest');
const app = require('../../server');
const { generateToken } = require('../../utils/auth.utils');

describe('Article create vs update', () => {
  let adminToken;
  let createdId;
  let baselineCount;

  beforeAll(() => {
    adminToken = generateToken({ role: 'admin' });
  });

  afterAll(async () => {
    if (!createdId) return;
    await request(app)
      .delete(`/api/articles/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  it('POST creates an article, PUT updates same id without growing the catalog', async () => {
    const listBefore = await request(app).get('/api/articles');
    expect(listBefore.statusCode).toBe(200);
    const beforeItems = Array.isArray(listBefore.body) ? listBefore.body : listBefore.body.data || [];
    baselineCount = beforeItems.length;

    const createRes = await request(app)
      .post('/api/articles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Edit-Update Regression Article',
        description: 'Created for edit→update regression coverage.',
        categoryId: 'general',
        paragraphs: ['__EVBLOCKS__[{"type":"paragraph","id":"t1","data":{"text":"Original body"}}]'],
        active: true,
        status: 'published'
      });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.id).toBeTruthy();
    createdId = createRes.body.id;

    const listAfterCreate = await request(app).get('/api/articles');
    const afterCreate = Array.isArray(listAfterCreate.body)
      ? listAfterCreate.body
      : listAfterCreate.body.data || [];
    expect(afterCreate.length).toBe(baselineCount + 1);

    const updateRes = await request(app)
      .put(`/api/articles/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Edit-Update Regression Article (edited)',
        description: 'Updated in place — must keep the same id.',
        categoryId: 'general',
        paragraphs: ['__EVBLOCKS__[{"type":"paragraph","id":"t1","data":{"text":"Updated body"}}]'],
        active: true,
        status: 'published'
      });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.id).toBe(createdId);
    expect(updateRes.body.title).toContain('(edited)');
    expect(JSON.stringify(updateRes.body.paragraphs || [])).toContain('Updated body');

    const listAfterUpdate = await request(app).get('/api/articles');
    const afterUpdate = Array.isArray(listAfterUpdate.body)
      ? listAfterUpdate.body
      : listAfterUpdate.body.data || [];
    expect(afterUpdate.length).toBe(baselineCount + 1);

    const ids = afterUpdate.map((a) => a.id);
    expect(ids.filter((id) => id === createdId)).toHaveLength(1);
  });

  it('POST with an existing id updates in place (defense against mis-routed edit)', async () => {
    expect(createdId).toBeTruthy();

    const listBefore = await request(app).get('/api/articles');
    const beforeItems = Array.isArray(listBefore.body) ? listBefore.body : listBefore.body.data || [];
    const countBefore = beforeItems.length;

    const res = await request(app)
      .post('/api/articles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        id: createdId,
        title: 'Edit-Update Regression Article (post-upsert)',
        description: 'POST with existing id must not duplicate.',
        categoryId: 'general',
        paragraphs: ['__EVBLOCKS__[{"type":"paragraph","id":"t1","data":{"text":"Upserted body"}}]'],
        active: true,
        status: 'published'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.id).toBe(createdId);
    expect(res.body.title).toContain('post-upsert');

    const listAfter = await request(app).get('/api/articles');
    const afterItems = Array.isArray(listAfter.body) ? listAfter.body : listAfter.body.data || [];
    expect(afterItems.length).toBe(countBefore);
  });

  it('vehicle POST upsert preserves id on edit-style save', async () => {
    const vehicleId = `test-edit-vehicle-${Date.now()}`;
    const payload = {
      id: vehicleId,
      name: 'Test Edit Vehicle',
      categoryId: 'tata',
      parentModel: 'Test Edit',
      variantName: 'Base',
      price: '10 Lakh',
      seating: '5',
      dimensions: 'N/A',
      groundClearance: 'N/A',
      batteryCapacity: '40 kWh',
      tyreSize: 'N/A',
      bootFrunkSpace: 'N/A',
      bhpTorque: 'N/A',
      drivetrain: 'FWD',
      safetyRating: 'N/A',
      status: 'Published'
    };

    const createRes = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);
    expect([200, 201]).toContain(createRes.statusCode);
    expect(createRes.body.id).toBe(vehicleId);

    const updateRes = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...payload, name: 'Test Edit Vehicle Updated', price: '11 Lakh' });
    expect([200, 201]).toContain(updateRes.statusCode);
    expect(updateRes.body.id).toBe(vehicleId);
    expect(updateRes.body.name).toContain('Updated');

    await request(app)
      .delete(`/api/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });
});
