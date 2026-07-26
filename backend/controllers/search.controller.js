/**
 * Enterprise Search & Recommendation Controller
 */
const searchService = require('../services/search.service');
const recommendationService = require('../services/recommendation.service');

class SearchController {
  async unifiedSearch(req, res, next) {
    try {
      const q = req.query.q || req.query.search || '';
      const results = await searchService.unifiedSearch(q, req.query);
      res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }

  async autocomplete(req, res, next) {
    try {
      const q = req.query.q || req.query.search || '';
      const suggestions = await searchService.autocomplete(q);
      res.status(200).json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecommendations(req, res, next) {
    try {
      const { vehicleId, articleId, categoryId } = req.query;
      const [vehicles, articles] = await Promise.all([
        recommendationService.getRelatedVehicles(vehicleId, categoryId),
        recommendationService.getRelatedArticles(articleId, categoryId)
      ]);

      res.status(200).json({
        success: true,
        data: {
          recommendedVehicles: vehicles,
          recommendedArticles: articles
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getTrendingContent(req, res, next) {
    try {
      const [vehicles, articles] = await Promise.all([
        recommendationService.getRelatedVehicles(null, null),
        recommendationService.getRelatedArticles(null, null)
      ]);

      res.status(200).json({
        success: true,
        data: {
          trendingVehicles: vehicles.slice(0, 4),
          popularArticles: articles.slice(0, 4),
          popularSearches: ['Tata Nexon EV', 'Mahindra XUV400', 'MG ZS EV', 'Solar ROI Calculator']
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SearchController();
