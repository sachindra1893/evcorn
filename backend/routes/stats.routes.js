/**
 * Usage Statistics Routes
 */
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');

// Public aggregate summary endpoint (cached 5 min)
router.get('/summary', statsController.getSummary);

module.exports = router;
