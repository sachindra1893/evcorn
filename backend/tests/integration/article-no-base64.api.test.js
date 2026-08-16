/**
 * Article create/update must never persist Base64 data:image URLs.
 */
const request = require('supertest');
const app = require('../../server');
const { generateToken } = require('../../utils/auth.utils');

jest.setTimeout(30000);

describe('Article Base64 Restriction Integration Test', () => {
  let adminToken;
  let createdId;

  beforeAll(() => {
    adminToken = generateToken({ role: 'admin' });
  });

  afterAll(async () => {
    if (!createdId) return;
    await request(app)
      .delete(`/api/articles/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  const tinyJpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

  it('POST rejects cover imageUrl as data:image', async () => {
    const res = await request(app)
      .post('/api/articles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Base64 Cover Reject',
        description: 'Must not store Base64 cover images in Mongo.',
        categoryId: 'general',
        imageUrl: tinyJpegDataUrl,
        paragraphs: ['__EVBLOCKS__[{"type":"paragraph","id":"t1","data":{"text":"x"}}]'],
        active: true,
        status: 'published'
      });

    expect(res.statusCode).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toMatch(/base64|data:image|cloudinary|upload/i);
  });

  it('POST rejects content-block data:image inside __EVBLOCKS__', async () => {
    const blocks = [
      {
        type: 'image',
        id: 'img1',
        data: { url: tinyJpegDataUrl, caption: '', alt: '' }
      }
    ];
    const res = await request(app)
      .post('/api/articles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Base64 Body Reject',
        description: 'Must not store Base64 content images in Mongo.',
        categoryId: 'general',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/cover.webp',
        paragraphs: [`__EVBLOCKS__${JSON.stringify(blocks)}`],
        blocks,
        active: true,
        status: 'published'
      });

    expect(res.statusCode).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toMatch(/base64|data:image|upload/i);
  });

  it('POST accepts Cloudinary URLs and PUT rejects later Base64 body', async () => {
    const createRes = await request(app)
      .post('/api/articles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'CDN Image Article',
        description: 'Stores only Cloudinary CDN URLs for images.',
        categoryId: 'general',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/cover.webp',
        paragraphs: [
          `__EVBLOCKS__${JSON.stringify([
            {
              type: 'image',
              id: 'img1',
              data: {
                url: 'https://res.cloudinary.com/demo/image/upload/v1/body.webp',
                caption: '',
                alt: ''
              }
            }
          ])}`
        ],
        active: true,
        status: 'published'
      });

    expect(createRes.statusCode).toBe(201);
    createdId = createRes.body.id;
    expect(JSON.stringify(createRes.body)).not.toMatch(/data:image\//i);

    const updateRes = await request(app)
      .put(`/api/articles/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'CDN Image Article',
        description: 'Attempt to sneak Base64 into an update.',
        categoryId: 'general',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/cover.webp',
        paragraphs: [
          `__EVBLOCKS__${JSON.stringify([
            {
              type: 'image',
              id: 'img1',
              data: { url: tinyJpegDataUrl, caption: '', alt: '' }
            }
          ])}`
        ],
        active: true,
        status: 'published'
      });

    expect(updateRes.statusCode).toBe(400);

    const getRes = await request(app).get(`/api/articles/${createdId}`);
    expect(getRes.statusCode).toBe(200);
    expect(JSON.stringify(getRes.body)).not.toMatch(/data:image\//i);
    expect(JSON.stringify(getRes.body)).toContain('res.cloudinary.com');
  });
});
