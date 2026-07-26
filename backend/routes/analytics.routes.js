/**
 * Analytics & Business Intelligence Routes
 */
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

router.post('/event', analyticsController.trackEvent);
router.get('/overview', analyticsController.getOverview);
router.get('/top-content', analyticsController.getTopContent);
router.get('/search-queries', analyticsController.getSearchAnalytics);

module.exports = router;
