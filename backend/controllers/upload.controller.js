/**
 * Upload Controller
 */
const { uploadBuffer, deleteImage } = require('../services/upload.service');
const { BadRequestError } = require('../errors/AppError');

class UploadController {
  async uploadImage(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError('No image file provided in multipart payload.');
      }
      const result = await uploadBuffer(req.file.buffer, 'evcorn');
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteImage(req, res, next) {
    try {
      const publicId = req.body?.public_id || req.body?.url || req.query?.public_id || req.query?.url;
      if (!publicId) {
        throw new BadRequestError('Missing public_id or url parameter');
      }
      const result = await deleteImage(publicId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getUploadTest(req, res, next) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Test endpoint disabled in production' });
      }
      res.status(200).json({
        status: 'online',
        message: 'EVCorn Cloudinary Upload API is ready for Postman verification',
        endpoint: 'POST /api/upload',
        contentType: 'multipart/form-data',
        allowedFieldNames: ['file', 'image'],
        browserTestPage: '/upload-test.html'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UploadController();
