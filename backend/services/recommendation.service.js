/**
 * Deterministic Recommendation Engine Service
 * Generates explainable, rule-based recommendations for vehicles and articles.
 * Phase 4: scoped Mongo queries + short TTL cache (avoid full-catalog scans).
 */
const vehicleRepository = require('../repositories/vehicle.repository');
const articleRepository = require('../repositories/article.repository');
const { toVehicleListDTO } = require('../dto/vehicle.dto');
const { toArticleListDTO } = require('../dto/article.dto');
const { articleHref, modelHref } = require('../utils/entity-href');
const appCache = require('../utils/cache');

/** Fields needed for ranking + list DTO (keeps memory/payload down vs full docs). */
const RECOMMENDATION_VEHICLE_PROJECTION = [
  'id', 'name', 'categoryId', 'parentModel', 'variantName', 'brandSlug',
  'imageUrl', 'batteryCapacity', 'bodyStyle', 'status', 'brand',
  'pricing.exShowroomPriceINR', 'pricing.priceText',
  'performance.claimedRangeKM', 'performance.rangeText',
  'battery.capacityKWh',
  'dimensionsObj.seatingCapacity',
  'media.mainImage', 'media.cloudinaryMainImage'
].join(' ');

class RecommendationService {
  /**
   * Recommend Related Vehicles based on Brand, Category, and Price Range (±20%)
   */
  async getRelatedVehicles(currentVehicleId, categoryId, targetPriceINR) {
    const cacheKey = appCache.KEYS.RECOMMENDATIONS(
      `v:${currentVehicleId || ''}:${categoryId || ''}:${targetPriceINR || ''}`
    );
    const cached = appCache.get(cacheKey);
    if (cached !== undefined) return cached;

    // No reference vehicle or category to compare against (e.g. the "trending"
    // widget, which calls this with (null, null)). Fall back to a deterministic
    // top-N slate — scoped query, not a full catalog load.
    if (!currentVehicleId && !categoryId) {
      const top = await vehicleRepository.findAll(
        { status: { $in: ['Launched', 'Upcoming'] } },
        RECOMMENDATION_VEHICLE_PROJECTION,
        { name: 1 },
        0,
        6
      );
      const result = toVehicleListDTO(top);
      appCache.set(cacheKey, result, appCache.TTL.RECOMMENDATIONS);
      return result;
    }

    let current = null;
    if (currentVehicleId) {
      current = await vehicleRepository.findById(currentVehicleId);
    }

    // Prefer category-scoped reads. File-DB ignores $or and returns the catalog
    // (small); Mongo uses the categoryId index and caps candidates.
    const statusFilter = { status: { $in: ['Launched', 'Upcoming'] } };
    const filterQuery = categoryId
      ? { $and: [statusFilter, { categoryId: String(categoryId).toLowerCase() }] }
      : statusFilter;

    const candidates = await vehicleRepository.findAll(
      filterQuery,
      RECOMMENDATION_VEHICLE_PROJECTION,
      { name: 1 },
      0,
      48
    );

    const filtered = candidates.filter(v => {
      if (v.id === currentVehicleId) return false;
      const categoryMatch = categoryId && v.categoryId === categoryId;
      const brandMatch = current && (
        (v.brand && current.brand && v.brand === current.brand) ||
        (v.categoryId && current.categoryId && v.categoryId === current.categoryId) ||
        (v.brandSlug && current.brandSlug && v.brandSlug === current.brandSlug)
      );
      return categoryMatch || brandMatch;
    });

    const ranked = filtered.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      if (categoryId && a.categoryId === categoryId) scoreA += 5;
      if (categoryId && b.categoryId === categoryId) scoreB += 5;
      if (current && a.brand && current.brand && a.brand === current.brand) scoreA += 3;
      if (current && b.brand && current.brand && b.brand === current.brand) scoreB += 3;
      if (current && a.categoryId === current.categoryId) scoreA += 2;
      if (current && b.categoryId === current.categoryId) scoreB += 2;
      return scoreB - scoreA;
    });

    const result = toVehicleListDTO(ranked.slice(0, 6));
    appCache.set(cacheKey, result, appCache.TTL.RECOMMENDATIONS);
    return result;
  }

  /**
   * Recommend Related Articles based on Category
   */
  async getRelatedArticles(currentArticleId, categoryId) {
    const cacheKey = appCache.KEYS.RECOMMENDATIONS(
      `a:${currentArticleId || ''}:${categoryId || ''}`
    );
    const cached = appCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const filterQuery = { active: true, status: 'published' };
    if (categoryId) filterQuery.categoryId = categoryId.toLowerCase();

    const articles = await articleRepository.findAll(
      filterQuery,
      { paragraphs: 0, blocks: 0, revisions: 0, media: 0, cloudinaryImage: 0, cloudinaryImages: 0 },
      { createdAt: -1 },
      0,
      6
    );
    const filtered = articles.filter(a => a.id !== currentArticleId && (a._id ? a._id.toString() !== currentArticleId : true));
    const result = toArticleListDTO(filtered.slice(0, 4));
    appCache.set(cacheKey, result, appCache.TTL.RECOMMENDATIONS);
    return result;
  }
}

module.exports = new RecommendationService();
