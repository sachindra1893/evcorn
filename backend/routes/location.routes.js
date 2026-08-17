/**
 * Server-Side Location Router
 */
const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');

router.get('/detect', locationController.detectLocation);

module.exports = router;
