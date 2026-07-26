/**
 * Upload Routes Definition (Secured with Rate Limiter & File Validation)
 */
const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { secureUpload } = require('../middlewares/upload.middleware');
const { checkAdminAuth } = require('../middlewares/auth.middleware');
const { uploadLimiter } = require('../middlewares/rateLimit.middleware');

router.post('/upload', checkAdminAuth, uploadLimiter, secureUpload.single('file'), uploadController.uploadImage);
router.delete('/upload', checkAdminAuth, uploadController.deleteImage);
router.post('/upload/delete', checkAdminAuth, uploadController.deleteImage);
router.get('/upload-test', uploadController.getUploadTest);

module.exports = router;
