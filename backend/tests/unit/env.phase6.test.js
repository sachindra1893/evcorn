const {
  validateEnv,
  INSECURE_JWT_DEFAULT
} = require('../../config/env');

describe('validateEnv production fail-fast (Phase 6)', () => {
  const base = {
    PORT: 3000,
    NODE_ENV: 'production',
    MONGO_URI: 'mongodb+srv://example/evcorn',
    ADMIN_PASSWORD: 'strong-admin-pass',
    JWT_SECRET: 'explicit-jwt-secret-value',
    CLOUDINARY: {
      CLOUD_NAME: 'demo',
      API_KEY: 'key',
      API_SECRET: 'secret'
    }
  };

  it('accepts a fully configured production env', () => {
    expect(() =>
      validateEnv(base, {
        ADMIN_PASSWORD: 'strong-admin-pass',
        JWT_SECRET: 'explicit-jwt-secret-value'
      })
    ).not.toThrow();
  });

  it('rejects default ADMIN_PASSWORD in production', () => {
    expect(() =>
      validateEnv(
        { ...base, ADMIN_PASSWORD: 'admin' },
        { ADMIN_PASSWORD: 'admin', JWT_SECRET: 'explicit-jwt-secret-value' }
      )
    ).toThrow(/ADMIN_PASSWORD/);
  });

  it('rejects missing JWT_SECRET (built-in default) in production', () => {
    expect(() =>
      validateEnv(
        { ...base, JWT_SECRET: INSECURE_JWT_DEFAULT },
        { ADMIN_PASSWORD: 'strong-admin-pass' }
      )
    ).toThrow(/JWT_SECRET/);
  });

  it('rejects missing MONGO_URI unless File-DB opt-in is set', () => {
    expect(() =>
      validateEnv(
        { ...base, MONGO_URI: '' },
        {
          ADMIN_PASSWORD: 'strong-admin-pass',
          JWT_SECRET: 'explicit-jwt-secret-value'
        }
      )
    ).toThrow(/MONGO_URI/);

    expect(() =>
      validateEnv(
        { ...base, MONGO_URI: '' },
        {
          ADMIN_PASSWORD: 'strong-admin-pass',
          JWT_SECRET: 'explicit-jwt-secret-value',
          ALLOW_FILE_DB_IN_PRODUCTION: 'true'
        }
      )
    ).not.toThrow();
  });

  it('does not fail-fast outside production', () => {
    expect(() =>
      validateEnv(
        { ...base, NODE_ENV: 'development', ADMIN_PASSWORD: 'admin', JWT_SECRET: INSECURE_JWT_DEFAULT, MONGO_URI: '' },
        {}
      )
    ).not.toThrow();
  });

  it('rejects invalid PORT', () => {
    expect(() => validateEnv({ ...base, PORT: 0, NODE_ENV: 'development' }, {})).toThrow(/PORT/);
  });
});
