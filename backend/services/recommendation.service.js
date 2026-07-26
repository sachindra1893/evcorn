/**
 * Deterministic Recommendation Engine Service
 * Generates explainable, rule-based recommendations for vehicles and articles.
 */
const vehicleRepository = require('../repositories/vehicle.repository');
const articleRepository = require('../repositories/article.repository');
const { toVehicleListDTO } = require('../dto/vehicle.dto');
const { toArticleListDTO } = require('../dto/article.dto');

class RecommendationService {
  /**
   * Recommend Related Vehicles based on Brand, Category, and Price Range (±20%)
   */
  async getRelatedVehicles(currentVehicleId, categoryId, targetPriceINR) {
    const allVehicles = await vehicleRepository.findAll({}, null, { name: 1 });
    const current = allVehicles.find(v => v.id === currentVehicleId);

    const filtered = allVehicles.filter(v => {
      if (v.id === currentVehicleId) return false;
      // Primary match: Same category or same brand
      const categoryMatch = v.categoryId === categoryId;
      const brandMatch = current && v.brand === current.brand;
      return categoryMatch || brandMatch;
    });

    // Score & Rank Candidates
    const ranked = filtered.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      if (a.categoryId === categoryId) scoreA += 5;
      if (b.categoryId === categoryId) scoreB += 5;
      if (current && a.brand === current.brand) scoreA += 3;
      if (current && b.brand === current.brand) scoreB += 3;
      return scoreB - scoreA;
    });

    return toVehicleListDTO(ranked.slice(0, 6));
  }

  /**
   * Recommend Related Articles based on Category
   */
  async getRelatedArticles(currentArticleId, categoryId) {
    const filterQuery = { active: true, status: 'published' };
    if (categoryId) filterQuery.categoryId = categoryId.toLowerCase();

    const articles = await articleRepository.findAll(filterQuery, {}, { createdAt: -1 }, 0, 6);
    const filtered = articles.filter(a => a.id !== currentArticleId && (a._id ? a._id.toString() !== currentArticleId : true));
    return toArticleListDTO(filtered.slice(0, 4));
  }
}

module.exports = new RecommendationService();
