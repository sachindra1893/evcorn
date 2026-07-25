const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadBuffer } = require('../services/cloudinary.service');

// Configure Multer with memory storage (max 10MB per file)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * @route   POST /api/upload
 * @desc    Upload single image to Cloudinary (multipart/form-data)
 * @access  Public
 * @returns {JSON} Object containing url, public_id, width, height, format, original_filename
 */
router.post('/upload', (req, res, next) => {
  // Support field names: 'file' or 'image'
  const uploadSingle = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]);

  uploadSingle(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(500).json({ error: err.message });
    }

    try {
      const fileField = (req.files && req.files.file) ? req.files.file[0] : (req.files && req.files.image) ? req.files.image[0] : null;

      if (!fileField) {
        return res.status(400).json({ error: 'No file provided in request. Use field name "file" or "image".' });
      }

      // Upload memory buffer directly to Cloudinary
      const originalName = fileField.originalname ? fileField.originalname.split('.')[0] : '';
      const result = await uploadBuffer(fileField.buffer, 'evcorn');

      return res.status(200).json({
        url: result.url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        original_filename: result.original_filename || originalName
      });
    } catch (error) {
      console.error('API Upload Handler Error:', error);
      return res.status(500).json({ error: 'Cloudinary upload failed: ' + error.message });
    }
  });
});

/**
 * @route   GET /api/upload-test
 * @desc    Postman compatibility instructions & test status
 * @access  Public
 */
router.get('/upload-test', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Test endpoint disabled in production' });
  }

  res.status(200).json({
    status: 'online',
    message: 'EVCorn Cloudinary Upload API is ready for Postman verification',
    endpoint: 'POST /api/upload',
    contentType: 'multipart/form-data',
    allowedFieldNames: ['file', 'image'],
    browserTestPage: '/upload-test.html',
    expectedResponseFormat: {
      url: 'https://res.cloudinary.com/...',
      public_id: 'evcorn/sample_id',
      width: 1200,
      height: 800,
      format: 'webp',
      original_filename: 'sample'
    }
  });
});

/**
 * @route   DELETE /api/upload
 * @desc    Delete single image from Cloudinary by public_id or url
 * @access  Public
 */
router.delete('/upload', async (req, res) => {
  try {
    const publicId = req.body?.public_id || req.body?.url || req.query?.public_id || req.query?.url;
    if (!publicId) {
      return res.status(400).json({ error: 'Missing public_id or url parameter' });
    }

    const deletionResult = await deleteImage(publicId);
    return res.status(200).json(deletionResult);
  } catch (error) {
    console.error('API Image Delete Error:', error);
    return res.status(200).json({ success: false, error: error.message });
  }
});

// Alternative POST route for clients restricting DELETE body
router.post('/upload/delete', async (req, res) => {
  try {
    const publicId = req.body?.public_id || req.body?.url;
    if (!publicId) {
      return res.status(400).json({ error: 'Missing public_id or url parameter' });
    }

    const deletionResult = await deleteImage(publicId);
    return res.status(200).json(deletionResult);
  } catch (error) {
    console.error('API Image Delete Error:', error);
    return res.status(200).json({ success: false, error: error.message });
  }
});

module.exports = router;
