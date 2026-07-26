/**
 * Upload Routes Definition
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/upload.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/upload', upload.single('file'), uploadController.uploadImage);
router.delete('/upload', uploadController.deleteImage);
router.post('/upload/delete', uploadController.deleteImage);
router.get('/upload-test', uploadController.getUploadTest);

module.exports = router;
