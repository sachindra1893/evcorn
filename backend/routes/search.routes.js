/**
 * Search & Recommendation Routes Definition
 */
const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');

router.get('/unified', searchController.unifiedSearch);
router.get('/autocomplete', searchController.autocomplete);
router.get('/recommendations', searchController.getRecommendations);
router.get('/trending', searchController.getTrendingContent);

module.exports = router;
