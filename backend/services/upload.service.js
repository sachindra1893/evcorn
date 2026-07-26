/**
 * Upload Service
 * Handles Cloudinary SDK buffer streaming and image destruction orchestration.
 */
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

function extractPublicId(urlOrPublicId) {
  if (!urlOrPublicId || typeof urlOrPublicId !== 'string') return '';
  if (!urlOrPublicId.includes('/upload/')) return urlOrPublicId;

  try {
    const afterUpload = urlOrPublicId.split('/upload/')[1];
    const pathWithoutVersion = afterUpload.replace(/^v\d+\//, '');
    return pathWithoutVersion.replace(/\.[^/.]+$/, '');
  } catch (err) {
    return urlOrPublicId;
  }
}

async function uploadBuffer(fileBuffer, folder = 'evcorn') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format: 'webp',
        quality: 'auto'
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary Upload Stream Error:', error);
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          original_filename: result.original_filename
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
}

async function deleteImage(urlOrPublicId) {
  const publicId = extractPublicId(urlOrPublicId);
  if (!publicId) return { success: false, reason: 'Empty public_id' };

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`Cloudinary Image Destroy Result for ${publicId}:`, result);
    return { success: result.result === 'ok' || result.result === 'not found', result: result.result };
  } catch (err) {
    logger.warn(`Cloudinary Image Destroy Warning for ${publicId}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  extractPublicId,
  uploadBuffer,
  deleteImage
};
