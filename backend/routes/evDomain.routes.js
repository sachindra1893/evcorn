/**
 * EV Domain Intelligence Routes Definition
 */
const express = require('express');
const router = express.Router();
const evDomainController = require('../controllers/evDomain.controller');

router.post('/score', evDomainController.getEVScore);
router.post('/tco', evDomainController.getTCO);
router.post('/charging-cost', evDomainController.getChargingCost);
router.post('/real-range', evDomainController.getRealWorldRange);
router.post('/compatibility', evDomainController.checkCompatibility);
router.post('/smart-recommendations', evDomainController.getSmartRecommendations);

module.exports = router;
