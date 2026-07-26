const { generateToken, verifyToken } = require('../../utils/auth.utils');

describe('Auth Utilities (Unit Tests)', () => {
  it('should issue a valid JWT token and verify payload', () => {
    const payload = { role: 'admin', user: 'system' };
    const token = generateToken(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded).toBeDefined();
    expect(decoded.role).toBe('admin');
    expect(decoded.user).toBe('system');
  });

  it('should return null for malformed or invalid JWT token', () => {
    const decoded = verifyToken('invalid.token.structure');
    expect(decoded).toBeNull();
  });
});
