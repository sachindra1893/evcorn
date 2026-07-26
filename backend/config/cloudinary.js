/**
 * Cloudinary SDK Central Configuration
 */
const cloudinary = require('cloudinary').v2;
const config = require('./env');
const logger = require('../utils/logger');

if (config.CLOUDINARY.CLOUD_NAME && config.CLOUDINARY.API_KEY && config.CLOUDINARY.API_SECRET) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY.CLOUD_NAME,
    api_key: config.CLOUDINARY.API_KEY,
    api_secret: config.CLOUDINARY.API_SECRET,
    secure: true
  });
  logger.info(`Cloudinary SDK configured for cloud: ${config.CLOUDINARY.CLOUD_NAME}`);
} else {
  logger.warn('Cloudinary credentials missing in environment variables.');
}

module.exports = cloudinary;
