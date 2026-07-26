/**
 * Health & Metrics Routes Definition
 */
const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

router.get('/health', healthController.getHealth);
router.get('/health/live', healthController.getLiveness);
router.get('/health/ready', healthController.getReadiness);
router.get('/metrics', healthController.getMetrics);

module.exports = router;
