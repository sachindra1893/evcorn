/**
 * Unified Search & Discovery Engine Service
 * Phase 4: short-TTL cache + light projections for list payloads.
 */
const vehicleRepository = require('../repositories/vehicle.repository');
const articleRepository = require('../repositories/article.repository');
const categoryRepository = require('../repositories/category.repository');
const { toVehicleLightListDTO } = require('../dto/vehicle.dto');
const { toArticleLightListDTO } = require('../dto/article.dto');
const { publishedVehicleStatusFilter } = require('../utils/apiQuery');
const appCache = require('../utils/cache');

const SEARCH_VEHICLE_PROJECTION = [
  'id', 'name', 'categoryId', 'parentModel', 'variantName',
  'imageUrl', 'batteryCapacity', 'bodyStyle', 'status',
  'pricing.exShowroomPriceINR', 'pricing.priceText',
  'performance.claimedRangeKM', 'performance.rangeText',
  'battery.capacityKWh',
  'dimensionsObj.seatingCapacity',
  'media.mainImage', 'media.cloudinaryMainImage'
].join(' ');

const SEARCH_ARTICLE_PROJECTION = {
  paragraphs: 0,
  blocks: 0,
  revisions: 0,
  'audit.archivedAt': 0,
  media: 0,
  cloudinaryImage: 0,
  cloudinaryImages: 0,
};

class SearchService {
  /**
   * Fast Autocomplete Suggestions (Capped at 8 items)
   */
  async autocomplete(q) {
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return [];
    }

    const searchTerm = q.trim().toLowerCase();
    const cacheKey = appCache.KEYS.SEARCH_AUTOCOMPLETE(searchTerm);
    const cached = appCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const containsRegex = new RegExp(searchTerm, 'i');
    const articleQueryFilter = {
      active: true,
      $or: [{ status: 'published' }, { status: { $exists: false } }]
    };

    const [vehicles, articles, categories] = await Promise.all([
      vehicleRepository.findAll({
        $and: [
          publishedVehicleStatusFilter('Published'),
          { $or: [{ name: containsRegex }, { parentModel: containsRegex }] }
        ]
      }, 'id name categoryId parentModel imageUrl', { name: 1 }, 0, 5),
      articleRepository.findAll({ ...articleQueryFilter, title: containsRegex }, 'id title categoryId imageUrl', { createdAt: -1 }, 0, 5),
      // Prefer cached category list when warm — fall back to repository
      (async () => {
        const catCached = appCache.get(appCache.KEYS.CATEGORIES());
        if (catCached !== undefined) return catCached;
        return categoryRepository.findAll();
      })()
    ]);

    const suggestions = [];

    // 1. Brand / Category Matches
    categories.filter(c => (c.name || '').toLowerCase().includes(searchTerm)).forEach(c => {
      suggestions.push({
        type: 'brand',
        title: c.name,
        subtitle: 'Brand',
        url: `/evs?category=${c.id}`
      });
    });

    // 2. Vehicle Matches
    vehicles.forEach(v => {
      suggestions.push({
        type: 'vehicle',
        title: v.name,
        subtitle: v.parentModel || 'Electric Vehicle',
        url: `/ev/${v.categoryId}/${v.parentModel ? v.parentModel.toLowerCase().replace(/\s+/g, '-') : v.id}`,
        imageUrl: v.imageUrl
      });
    });

    // 3. Article Matches
    articles.forEach(a => {
      const artId = a._id ? a._id.toString() : a.id;
      suggestions.push({
        type: 'article',
        title: a.title,
        subtitle: 'Article / Buying Guide',
        url: `/articles/${artId}`,
        imageUrl: a.imageUrl
      });
    });

    const result = suggestions.slice(0, 8);
    appCache.set(cacheKey, result, appCache.TTL.SEARCH);
    return result;
  }

  /**
   * Unified Search with Relevance Ranking & Zero-Result Fallbacks
   */
  async unifiedSearch(q, filters = {}) {
    const searchTerm = (q || '').trim().toLowerCase();
    const filterFp = appCache.fingerprintQuery(filters);
    const cacheKey = appCache.KEYS.SEARCH_UNIFIED(`${searchTerm}|${filterFp}`);
    const cached = appCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const regex = searchTerm ? new RegExp(searchTerm, 'i') : null;

    const vehicleAndConditions = [publishedVehicleStatusFilter('Published')];
    const vehicleQuery = {};
    if (filters.category || filters.categoryId) {
      vehicleQuery.categoryId = (filters.category || filters.categoryId).toLowerCase();
    }
    if (regex) {
      vehicleAndConditions.push({
        $or: [
          { name: regex },
          { parentModel: regex },
          { variantName: regex }
        ]
      });
    }
    if (vehicleAndConditions.length === 1) {
      Object.assign(vehicleQuery, vehicleAndConditions[0]);
    } else {
      vehicleQuery.$and = vehicleAndConditions;
    }

    const articleQuery = { active: true, $or: [{ status: 'published' }, { status: { $exists: false } }] };
    if (filters.category || filters.categoryId) {
      articleQuery.categoryId = (filters.category || filters.categoryId).toLowerCase();
    }
    if (regex) {
      articleQuery.$or = [
        { title: regex },
        { description: regex }
      ];
    }

    // Hard cap result sets — empty/broad queries must not serialize the full
    // catalog (proven O(n) payload blow-up at 2k–10k vehicles). Autocomplete
    // already caps at 5+5; unified search keeps a generous but bounded page.
    const SEARCH_VEHICLE_LIMIT = 50;
    const SEARCH_ARTICLE_LIMIT = 30;

    const [rawVehicles, rawArticles, categories] = await Promise.all([
      vehicleRepository.findAll(vehicleQuery, SEARCH_VEHICLE_PROJECTION, { name: 1 }, 0, SEARCH_VEHICLE_LIMIT),
      articleRepository.findAll(articleQuery, SEARCH_ARTICLE_PROJECTION, { createdAt: -1 }, 0, SEARCH_ARTICLE_LIMIT),
      (async () => {
        const catCached = appCache.get(appCache.KEYS.CATEGORIES());
        if (catCached !== undefined) return catCached;
        return categoryRepository.findAll();
      })()
    ]);

    const vehicles = toVehicleLightListDTO(rawVehicles);
    const articles = toArticleLightListDTO(rawArticles);
    const totalResults = vehicles.length + articles.length;

    // Zero-Result Experience: Suggest Related Brands & Fallback Content
    let fallbacks = null;
    if (totalResults === 0 && searchTerm) {
      const fallbackArticles = await articleRepository.findAll(
        { active: true, status: 'published' },
        SEARCH_ARTICLE_PROJECTION,
        { createdAt: -1 },
        0,
        3
      );
      fallbacks = {
        message: `No direct matches found for "${q}". Explore top EV brands and guides below:`,
        recommendedBrands: categories.slice(0, 4),
        suggestedArticles: toArticleLightListDTO(fallbackArticles)
      };
    }

    const result = {
      query: q,
      totalResults,
      vehicles,
      articles,
      fallbacks
    };
    appCache.set(cacheKey, result, appCache.TTL.SEARCH);
    return result;
  }
}

module.exports = new SearchService();
