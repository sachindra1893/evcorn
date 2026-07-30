/**
 * Enterprise File Upload Middleware & Security Guards
 * MIME whitelist + magic-byte verification + size cap (Phase 7).
 */
const multer = require('multer');
const { BadRequestError } = require('../errors/AppError');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Verify buffer magic bytes match a claimed image MIME.
 * @param {Buffer} buffer
 * @param {string} mime
 * @returns {boolean}
 */
function matchesMagicBytes(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;

  if (mime === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mime === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mime === 'image/gif') {
    return buffer.slice(0, 4).toString('ascii') === 'GIF8';
  }
  if (mime === 'image/webp') {
    return (
      buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
      buffer.slice(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (mime === 'image/avif') {
    // ISO BMFF: ....ftyp....avif / avis / avif brands
    const box = buffer.slice(4, 8).toString('ascii');
    if (box !== 'ftyp') return false;
    const brand = buffer.slice(8, 12).toString('ascii');
    return brand === 'avif' || brand === 'avis' || brand === 'mif1';
  }
  return false;
}

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new BadRequestError(
        `Unsupported file format "${file.mimetype}". Allowed types: JPG, PNG, WEBP, GIF, AVIF`
      ),
      false
    );
  }
  cb(null, true);
};

const secureUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

/**
 * Post-multer guard: reject MIME spoofing when buffer magic does not match.
 */
function verifyUploadMagic(req, res, next) {
  if (!req.file) return next();
  if (!matchesMagicBytes(req.file.buffer, req.file.mimetype)) {
    return next(
      new BadRequestError(
        'Uploaded file content does not match the declared image type (magic-byte check failed).'
      )
    );
  }
  next();
}

module.exports = {
  secureUpload,
  verifyUploadMagic,
  matchesMagicBytes,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
};
