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
const healthRoutes = require('./health.routes');
const analyticsRoutes = require('./analytics.routes');
const searchRoutes = require('./search.routes');
const adminRoutes = require('./admin.routes');
const evDomainRoutes = require('./evDomain.routes');
const commentRoutes = require('./comment.routes');

router.use('/', healthRoutes);
router.use('/domain', evDomainRoutes);
router.use('/admin', adminRoutes);
router.use('/search', searchRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/articles', articleRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/comments', commentRoutes);
router.use('/', uploadRoutes);

module.exports = router;
