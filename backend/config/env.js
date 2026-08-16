/**
 * Central Environment Configuration & Startup Audit
 * Validates environment configuration at boot and fails fast if invalid.
 */
require('dotenv').config();

/** Built-in JWT fallback — forbidden in production. */
const INSECURE_JWT_DEFAULT = 'evcorn_secure_jwt_secret_2026';

const config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin',
  JWT_SECRET: process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || INSECURE_JWT_DEFAULT,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [
        'https://evcorn.com',
        'https://www.evcorn.com',
        'https://evcorn.vercel.app',
        'https://evcorn-frontend-ssr.onrender.com',
        'http://localhost:4200',
        'http://127.0.0.1:4200'
      ],
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    API_KEY: process.env.CLOUDINARY_API_KEY || '',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || ''
  },
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  USER_JWT_SECRET: process.env.USER_JWT_SECRET || 'evcorn_user_jwt_secret_2026'
};

/**
 * Startup audit. In production, insecure defaults and missing Atlas URI are fatal
 * (unless ALLOW_FILE_DB_IN_PRODUCTION=true intentionally opts into File-DB).
 * @param {typeof config} [cfg]
 * @param {NodeJS.ProcessEnv} [env]
 */
function validateEnv(cfg = config, env = process.env) {
  if (isNaN(cfg.PORT) || cfg.PORT <= 0) {
    throw new Error('FATAL: Environment variable PORT must be a valid positive number.');
  }

  if (cfg.NODE_ENV !== 'production') {
    return;
  }

  const fatal = [];

  if (!env.ADMIN_PASSWORD || cfg.ADMIN_PASSWORD === 'admin') {
    fatal.push('ADMIN_PASSWORD must be set to a non-default value in production');
  }

  if (!env.JWT_SECRET || cfg.JWT_SECRET === INSECURE_JWT_DEFAULT) {
    fatal.push('JWT_SECRET must be explicitly set in production (not the built-in default)');
  }

  if (!cfg.MONGO_URI && env.ALLOW_FILE_DB_IN_PRODUCTION !== 'true') {
    fatal.push(
      'MONGO_URI is required in production (set ALLOW_FILE_DB_IN_PRODUCTION=true to intentionally use File-DB)'
    );
  }

  const cloudOk =
    Boolean(cfg.CLOUDINARY.CLOUD_NAME) &&
    Boolean(cfg.CLOUDINARY.API_KEY) &&
    Boolean(cfg.CLOUDINARY.API_SECRET);
  if (!cloudOk) {
    console.warn(
      '⚠️ WARNING: Cloudinary credentials incomplete — media uploads will fail until CLOUDINARY_* are set.'
    );
  }

  if (fatal.length) {
    throw new Error(`FATAL production environment:\n${fatal.map((f) => ` - ${f}`).join('\n')}`);
  }
}

validateEnv();

module.exports = config;
module.exports.validateEnv = validateEnv;
module.exports.INSECURE_JWT_DEFAULT = INSECURE_JWT_DEFAULT;
