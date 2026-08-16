/**
 * Google OAuth Authentication API Integration Test
 * Verifies the 5 mandatory scenarios:
 * 1. Happy Path: Valid Google ID token verification, user creation in MongoDB, session JWT issuance.
 * 2. Rejection 1: Garbage / random string token -> 401 Unauthorized.
 * 3. Rejection 2: Missing token -> 401 Unauthorized.
 * 4. Rejection 3: Expired / malformed token -> 401 Unauthorized.
 * 5. Rejection 4: Tampered token (modified character) -> 401 Unauthorized.
 */
const request = require('supertest');
const { OAuth2Client } = require('google-auth-library');
const app = require('../../server');
const User = require('../../models/User');
const { verifyUserToken } = require('../../utils/auth.utils');

jest.setTimeout(30000);

describe('Google OAuth 2.0 Endpoint Integration Tests (POST /api/auth/google)', () => {
  const mockUserGoogleId = 'google-user-id-998877';
  const mockUserEmail = 'testuser@evcorn.com';
  const mockUserName = 'Test End User';
  const mockUserAvatar = 'https://lh3.googleusercontent.com/a/mock-avatar';

  let verifySpy;
  let findOneSpy;
  let createSpy;

  beforeAll(() => {
    // Spy on google-auth-library verifyIdToken method
    verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
  });

  afterAll(() => {
    verifySpy.mockRestore();
    if (findOneSpy) findOneSpy.mockRestore();
    if (createSpy) createSpy.mockRestore();
  });

  beforeEach(() => {
    verifySpy.mockReset();
  });

  // SCENARIO 1: Happy Path
  it('Scenario 1 [SUCCESS]: Valid Google token verifies, creates MongoDB user, and returns session JWT', async () => {
    const validMockToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjF2YWxpZFRva2VuIn0.valid_payload.valid_sig';

    verifySpy.mockResolvedValueOnce({
      getPayload: () => ({
        sub: mockUserGoogleId,
        email: mockUserEmail,
        name: mockUserName,
        picture: mockUserAvatar
      })
    });

    const mockSavedUser = {
      _id: '65c2f8e1234567890abcdef1',
      googleId: mockUserGoogleId,
      email: mockUserEmail,
      name: mockUserName,
      avatarUrl: mockUserAvatar,
      createdAt: new Date()
    };

    findOneSpy = jest.spyOn(User, 'findOne').mockResolvedValue(null);
    createSpy = jest.spyOn(User, 'create').mockResolvedValue(mockSavedUser);

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: validMockToken });

    console.log('=== SCENARIO 1 LOG (Happy Path - Google Sign-In Success) ===');
    console.log('Status Code:', res.status);
    console.log('Response Body:', JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(mockUserEmail);
    expect(res.body.user.googleId).toBe(mockUserGoogleId);

    // Verify custom session JWT
    const decodedJwt = verifyUserToken(res.body.token);
    expect(decodedJwt).not.toBeNull();
    expect(decodedJwt.id).toBe(mockSavedUser._id.toString());
    expect(decodedJwt.email).toBe(mockUserEmail);
    expect(decodedJwt.role).toBe('user');

    findOneSpy.mockRestore();
    createSpy.mockRestore();
  });

  // SCENARIO 2: Garbage / Random String Token
  it('Scenario 2 [REJECTED]: Sending garbage/random string token returns 401 Unauthorized', async () => {
    const garbageToken = 'random_garbage_string_xyz_98765';

    verifySpy.mockRejectedValueOnce(new Error('Wrong number of segments in token: random_garbage_string_xyz_98765'));

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: garbageToken });

    console.log('=== SCENARIO 2 LOG (Rejection - Garbage/Random Token) ===');
    console.log('Status Code:', res.status);
    console.log('Response Body:', JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.success).not.toBe(true);
  });

  // SCENARIO 3: Missing Token
  it('Scenario 3 [REJECTED]: Sending no token returns 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({});

    console.log('=== SCENARIO 3 LOG (Rejection - Missing Token) ===');
    console.log('Status Code:', res.status);
    console.log('Response Body:', JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.success).not.toBe(true);
  });

  // SCENARIO 4: Expired or Malformed Token
  it('Scenario 4 [REJECTED]: Sending an expired or malformed token returns 401 Unauthorized', async () => {
    const expiredToken = 'eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE2MDAwMDAwMDB9.expired_signature';

    verifySpy.mockRejectedValueOnce(new Error('Token used too late, exp 1600000000 has passed'));

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: expiredToken });

    console.log('=== SCENARIO 4 LOG (Rejection - Expired/Malformed Token) ===');
    console.log('Status Code:', res.status);
    console.log('Response Body:', JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.success).not.toBe(true);
  });

  // SCENARIO 5: Tampered Token
  it('Scenario 5 [REJECTED]: Sending a valid-looking but tampered token returns 401 Unauthorized', async () => {
    const tamperedToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjF2YWxpZFRva2VuIn0.valid_payload.TAMPERED_sig';

    verifySpy.mockRejectedValueOnce(new Error('Invalid token signature'));

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: tamperedToken });

    console.log('=== SCENARIO 5 LOG (Rejection - Tampered Token) ===');
    console.log('Status Code:', res.status);
    console.log('Response Body:', JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.success).not.toBe(true);
  });
});
