/**
 * Central Express Router Aggregator
 */
const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const categoryRoutes = require('./category.routes');
const articleRoutes = require('./article.routes');
const vehicleRoutes = require('./vehicle.routes');
const uploadRoutes = require('./upload');

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/articles', articleRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/', uploadRoutes);

module.exports = router;
