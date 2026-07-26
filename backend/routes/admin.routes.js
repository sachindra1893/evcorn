/**
 * Enterprise Admin Operations Routes Definition
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { checkAdminAuth } = require('../middlewares/auth.middleware');

router.get('/dashboard', checkAdminAuth, adminController.getDashboard);
router.post('/bulk', checkAdminAuth, adminController.executeBulkOperation);
router.get('/export', checkAdminAuth, adminController.exportData);
router.get('/activity', checkAdminAuth, adminController.getActivityLog);
router.get('/media', checkAdminAuth, adminController.getMediaLibrary);

module.exports = router;
