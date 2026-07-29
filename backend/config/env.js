/**
 * Central Environment Configuration & Startup Audit
 * Validates environment configuration at boot and fails fast if invalid.
 */
require('dotenv').config();

const config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin',
  JWT_SECRET: process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'evcorn_secure_jwt_secret_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [
        'https://evcorn.com',
        'https://www.evcorn.com',
        'https://evcorn.vercel.app',
        'http://localhost:4200',
        'http://127.0.0.1:4200'
      ],
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    API_KEY: process.env.CLOUDINARY_API_KEY || '',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || ''
  }
};

// Startup Audit Guard
function validateEnv() {
  if (isNaN(config.PORT) || config.PORT <= 0) {
    throw new Error('FATAL: Environment variable PORT must be a valid positive number.');
  }

  if (config.NODE_ENV === 'production') {
    if (!config.MONGO_URI) {
      console.warn('⚠️ WARNING: MONGO_URI is missing in production environment!');
    }
    if (config.ADMIN_PASSWORD === 'admin') {
      console.warn('⚠️ SECURITY WARNING: ADMIN_PASSWORD is set to default "admin" in production!');
    }
  }
}

validateEnv();

module.exports = config;
