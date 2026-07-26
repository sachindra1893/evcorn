/**
 * Central Environment Configuration
 * Prevents direct process.env access & magic strings across the codebase.
 */
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin',
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    API_KEY: process.env.CLOUDINARY_API_KEY || '',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || ''
  }
};
