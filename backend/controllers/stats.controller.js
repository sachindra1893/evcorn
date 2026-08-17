/**
 * Usage Statistics Summary Controller
 * Provides 30-day aggregate usage metrics for the homepage stats card.
 * Public, cached (5 min TTL), non-blocking.
 */
const mongoose = require('mongoose');
const Event = require('../models/Event');
const cache = require('../utils/cache');
const { _getTestEvents } = require('../utils/eventLogger');

class StatsController {
  async getSummary(req, res, next) {
    try {
      const cacheKey = cache.KEYS.STATS_SUMMARY();
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return res.status(200).json({
          success: true,
          data: cachedData
        });
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const summary = {
        comparisons: 0,
        calculatorUses: 0,
        vehiclesViewed: 0
      };

      if (mongoose.connection.readyState === 1) {
        const results = await Event.aggregate([
          {
            $match: {
              createdAt: { $gte: thirtyDaysAgo }
            }
          },
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 }
            }
          }
        ]);

        for (const row of results) {
          if (row._id === 'compare_started') summary.comparisons = row.count;
          if (row._id === 'calculator_used') summary.calculatorUses = row.count;
          if (row._id === 'vehicle_viewed') summary.vehiclesViewed = row.count;
        }
      } else {
        // Local unit test mode (when Mongoose is not connected)
        const testEvents = _getTestEvents();
        for (const ev of testEvents) {
          if (new Date(ev.createdAt) >= thirtyDaysAgo) {
            if (ev.type === 'compare_started') summary.comparisons++;
            if (ev.type === 'calculator_used') summary.calculatorUses++;
            if (ev.type === 'vehicle_viewed') summary.vehiclesViewed++;
          }
        }
      }

      // Cache the result for 5 minutes
      cache.set(cacheKey, summary, cache.TTL.STATS_SUMMARY);

      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new StatsController();
