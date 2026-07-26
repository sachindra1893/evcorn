/**
 * Enterprise File Upload Middleware & Security Guards
 */
const multer = require('multer');
const { BadRequestError } = require('../errors/AppError');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new BadRequestError(`Unsupported file format "${file.mimetype}". Allowed types: JPG, PNG, WEBP, GIF, AVIF`), false);
  }
  cb(null, true);
};

const secureUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

module.exports = {
  secureUpload,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
};
