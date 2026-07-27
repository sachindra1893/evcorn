/**
 * Unified Search & Discovery Engine Service
 */
const vehicleRepository = require('../repositories/vehicle.repository');
const articleRepository = require('../repositories/article.repository');
const categoryRepository = require('../repositories/category.repository');
const { toVehicleListDTO } = require('../dto/vehicle.dto');
const { toArticleListDTO } = require('../dto/article.dto');

class SearchService {
  /**
   * Fast Autocomplete Suggestions (Capped at 8 items)
   */
  async autocomplete(q) {
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return [];
    }

    const searchTerm = q.trim().toLowerCase();
    const containsRegex = new RegExp(searchTerm, 'i');
    const articleQueryFilter = {
      active: true,
      $or: [{ status: 'published' }, { status: { $exists: false } }]
    };

    const [vehicles, articles, categories] = await Promise.all([
      vehicleRepository.findAll({ status: 'Published', $or: [{ name: containsRegex }, { parentModel: containsRegex }] }, 'id name categoryId parentModel imageUrl', { name: 1 }, 0, 5),
      articleRepository.findAll({ ...articleQueryFilter, title: containsRegex }, 'id title categoryId imageUrl', { createdAt: -1 }, 0, 5),
      categoryRepository.findAll()
    ]);

    const suggestions = [];

    // 1. Brand / Category Matches
    categories.filter(c => c.name.toLowerCase().includes(searchTerm)).forEach(c => {
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

    return suggestions.slice(0, 8);
  }

  /**
   * Unified Search with Relevance Ranking & Zero-Result Fallbacks
   */
  async unifiedSearch(q, filters = {}) {
    const searchTerm = (q || '').trim().toLowerCase();
    const regex = searchTerm ? new RegExp(searchTerm, 'i') : null;

    const vehicleQuery = { status: 'Published' };
    if (filters.category || filters.categoryId) {
      vehicleQuery.categoryId = (filters.category || filters.categoryId).toLowerCase();
    }
    if (regex) {
      vehicleQuery.$or = [
        { name: regex },
        { parentModel: regex },
        { variantName: regex }
      ];
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

    const [rawVehicles, rawArticles, categories] = await Promise.all([
      vehicleRepository.findAll(vehicleQuery, null, { name: 1 }),
      articleRepository.findAll(articleQuery, null, { createdAt: -1 }),
      categoryRepository.findAll({})
    ]);

    const vehicles = toVehicleListDTO(rawVehicles);
    const articles = toArticleListDTO(rawArticles);
    const totalResults = vehicles.length + articles.length;

    // Zero-Result Experience: Suggest Related Brands & Fallback Content
    let fallbacks = null;
    if (totalResults === 0 && searchTerm) {
      const fallbackArticles = await articleRepository.findAll({ active: true, status: 'published' }, null, { createdAt: -1 }, 0, 3);
      fallbacks = {
        message: `No direct matches found for "${q}". Explore top EV brands and guides below:`,
        recommendedBrands: categories.slice(0, 4),
        suggestedArticles: toArticleListDTO(fallbackArticles)
      };
    }

    return {
      query: q,
      totalResults,
      vehicles,
      articles,
      fallbacks
    };
  }
}

module.exports = new SearchService();
