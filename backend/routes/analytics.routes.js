/**
 * Analytics & Business Intelligence Routes
 * Phase 7: read endpoints require admin auth; public event ingest stays open (rate-limited via apiLimiter).
 */
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { checkAdminAuth } = require('../middlewares/auth.middleware');

router.post('/event', analyticsController.trackEvent);
router.get('/overview', checkAdminAuth, analyticsController.getOverview);
router.get('/top-content', checkAdminAuth, analyticsController.getTopContent);
router.get('/search-queries', checkAdminAuth, analyticsController.getSearchAnalytics);

module.exports = router;
