/**
 * Scale-Ready Comment System Integration Test Suite
 * Tests all 5 mandatory scenarios:
 * 1. Full Flow: View comments (public), post top-level, post reply, edit own comment, delete own comment.
 * 2. Ownership Protection: User B attempts to edit or delete User A's comment -> 403 Forbidden.
 * 3. Rate Limiting: 6th rapid comment post within 1 min -> 429 Too Many Requests.
 * 4. Pagination: GET /api/comments with limit=2 returns at most 2 top-level items with pagination metadata.
 * 5. XSS Protection: Posting <script>alert(1)</script> is safely escaped before persistence.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const Comment = require('../../models/Comment');
const User = require('../../models/User');
const { generateUserToken } = require('../../utils/auth.utils');
const { fileDb } = require('../../config/database');

jest.setTimeout(30000);

describe('Comment System API Integration Suite (/api/comments)', () => {
  const targetId = 'test-article-comment-suite-99';
  const targetType = 'article';

  beforeEach(() => {
    fileDb.saveComments([]);
  });

  // Helper to generate isolated user token for per-scenario test isolation
  function createTestUser(emailPrefix) {
    const id = new mongoose.Types.ObjectId();
    const email = `${emailPrefix}@evcorn.com`;
    const token = generateUserToken({ id: id.toString(), email, role: 'user' });
    return { id: id.toString(), email, token };
  }

  // SCENARIO 1: Full Flow (View, Post, Reply, Edit, Delete)
  it('Scenario 1 [FULL FLOW]: Logged out views comments, Logged-in User A posts top-level, replies, edits, and soft-deletes own comment', async () => {
    const userA = createTestUser('usera1');

    // 1. Logged out view
    const viewRes = await request(app)
      .get(`/api/comments?targetType=${targetType}&targetId=${targetId}&page=1&limit=25`);

    console.log('=== SCENARIO 1 LOG: Public Comment Fetch ===');
    console.log('Status Code:', viewRes.status);
    console.log('Response Body:', JSON.stringify(viewRes.body, null, 2));

    expect(viewRes.status).toBe(200);
    expect(viewRes.body.success).toBe(true);
    expect(Array.isArray(viewRes.body.data)).toBe(true);

    // 2. User A posts a top-level comment
    const postRes = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        targetType,
        targetId,
        text: 'This is User A top-level comment on electric vehicle charging!'
      });

    console.log('=== SCENARIO 1 LOG: User A Post Top-Level Comment ===');
    console.log('Status Code:', postRes.status);
    console.log('Response Body:', JSON.stringify(postRes.body, null, 2));

    expect(postRes.status).toBe(201);
    expect(postRes.body.success).toBe(true);
    expect(postRes.body.data._id).toBeDefined();

    const parentCommentId = postRes.body.data._id;

    // 3. User A posts a reply
    const replyRes = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        targetType,
        targetId,
        parentCommentId,
        text: 'This is User A reply to top-level comment.'
      });

    console.log('=== SCENARIO 1 LOG: User A Post Reply ===');
    console.log('Status Code:', replyRes.status);
    console.log('Response Body:', JSON.stringify(replyRes.body, null, 2));

    expect(replyRes.status).toBe(201);
    expect(replyRes.body.data.parentCommentId.toString()).toBe(parentCommentId.toString());

    // 4. User A edits top-level comment
    const editRes = await request(app)
      .patch(`/api/comments/${parentCommentId}`)
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        text: 'Updated User A top-level comment text.'
      });

    console.log('=== SCENARIO 1 LOG: User A Edit Own Comment ===');
    console.log('Status Code:', editRes.status);
    console.log('Response Body:', JSON.stringify(editRes.body, null, 2));

    expect(editRes.status).toBe(200);
    expect(editRes.body.data.text).toBe('Updated User A top-level comment text.');
    expect(editRes.body.data.editedAt).toBeDefined();

    // 5. User A deletes own reply comment
    const deleteRes = await request(app)
      .delete(`/api/comments/${replyRes.body.data._id}`)
      .set('Authorization', `Bearer ${userA.token}`);

    console.log('=== SCENARIO 1 LOG: User A Delete Own Reply ===');
    console.log('Status Code:', deleteRes.status);
    console.log('Response Body:', JSON.stringify(deleteRes.body, null, 2));

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);
    expect(deleteRes.body.data.text).toBe('[Comment deleted]');
  });

  // SCENARIO 2: Ownership Protection (HTTP 403)
  it('Scenario 2 [OWNERSHIP PROTECTION]: User B attempting to edit or delete User A comment returns 403 Forbidden', async () => {
    const userA = createTestUser('ownerA');
    const userB = createTestUser('attackerB');

    // Create a comment owned by User A
    const commentRes = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        targetType,
        targetId,
        text: 'User A original comment for ownership test'
      });

    const commentId = commentRes.body.data._id;

    // User B attempts to EDIT User A's comment
    const editRes = await request(app)
      .patch(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ text: 'Hacked edit attempt by User B' });

    console.log('=== SCENARIO 2 LOG: User B Edit User A Comment (Blocked) ===');
    console.log('Status Code:', editRes.status);
    console.log('Response Body:', JSON.stringify(editRes.body, null, 2));

    expect(editRes.status).toBe(403);
    expect(editRes.body.error.code).toBe('FORBIDDEN_ACCESS');

    // User B attempts to DELETE User A's comment
    const deleteRes = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${userB.token}`);

    console.log('=== SCENARIO 2 LOG: User B Delete User A Comment (Blocked) ===');
    console.log('Status Code:', deleteRes.status);
    console.log('Response Body:', JSON.stringify(deleteRes.body, null, 2));

    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.error.code).toBe('FORBIDDEN_ACCESS');
  });

  // SCENARIO 3: Rate Limiting (HTTP 429)
  it('Scenario 3 [RATE LIMITING]: Rapidly posting 6 comments in a row triggers 429 Too Many Requests on the 6th', async () => {
    const rateLimitUser = createTestUser('ratelimit');

    const results = [];
    for (let i = 1; i <= 6; i++) {
      const res = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${rateLimitUser.token}`)
        .send({
          targetType,
          targetId: 'rate-limit-test-id',
          text: `Rate limit test comment #${i}`
        });
      results.push(res);
    }

    console.log('=== SCENARIO 3 LOG: Rate Limit Test Results ===');
    console.log('Request 1-5 Statuses:', results.slice(0, 5).map(r => r.status));
    console.log('Request 6 Status Code:', results[5].status);
    console.log('Request 6 Response Body:', JSON.stringify(results[5].body, null, 2));

    expect(results[5].status).toBe(429);
    expect(results[5].body.error.code).toBe('COMMENT_RATE_LIMIT_EXCEEDED');
  });

  // SCENARIO 4: Pagination
  it('Scenario 4 [PAGINATION]: Querying page=1&limit=2 returns at most 2 top-level comments + correct pagination metadata', async () => {
    const paginatedTargetId = 'pagination-test-target-777';

    // Seed 5 top level comments using 5 distinct user tokens to avoid rate limits
    for (let i = 1; i <= 5; i++) {
      const u = createTestUser(`pager${i}`);
      await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${u.token}`)
        .send({
          targetType: 'article',
          targetId: paginatedTargetId,
          text: `Paginated comment #${i}`
        });
    }

    const pageRes = await request(app)
      .get(`/api/comments?targetType=article&targetId=${paginatedTargetId}&page=1&limit=2`);

    console.log('=== SCENARIO 4 LOG: Pagination Test ===');
    console.log('Status Code:', pageRes.status);
    console.log('Response Body:', JSON.stringify(pageRes.body, null, 2));

    expect(pageRes.status).toBe(200);
    expect(pageRes.body.success).toBe(true);
    expect(pageRes.body.data.length).toBe(2);
    expect(pageRes.body.pagination.page).toBe(1);
    expect(pageRes.body.pagination.limit).toBe(2);
    expect(pageRes.body.pagination.totalTopLevel).toBe(5);
    expect(pageRes.body.pagination.totalPages).toBe(3);
    expect(pageRes.body.pagination.hasNextPage).toBe(true);
  });

  // SCENARIO 5: XSS Protection
  it('Scenario 5 [XSS PROTECTION]: Comment containing <script>alert(1)</script> is safely HTML-entity escaped before storing', async () => {
    const xssUser = createTestUser('xssUser');
    const xssPayload = '<script>alert(1)</script>';

    const xssRes = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${xssUser.token}`)
      .send({
        targetType,
        targetId,
        text: xssPayload
      });

    console.log('=== SCENARIO 5 LOG: XSS Protection Test ===');
    console.log('Status Code:', xssRes.status);
    console.log('Response Body:', JSON.stringify(xssRes.body, null, 2));

    expect(xssRes.status).toBe(201);
    expect(xssRes.body.data.text).not.toContain('<script>');
    expect(xssRes.body.data.text).toContain('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
  });
});
