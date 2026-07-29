/**
 * Category / Brand Service
 * Phase 4: in-process cache for the read-heavy brand list (KEYS.CATEGORIES / TTL.CATEGORIES).
 */
const categoryRepository = require('../repositories/category.repository');
const { toCategoryDTO, toCategoryListDTO } = require('../dto/category.dto');
const { NotFoundError } = require('../errors/AppError');
const appCache = require('../utils/cache');

class CategoryService {
  async getCategories() {
    const cacheKey = appCache.KEYS.CATEGORIES();
    const cached = appCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const docs = await categoryRepository.findAll();
    const result = toCategoryListDTO(docs);
    appCache.set(cacheKey, result, appCache.TTL.CATEGORIES);
    return result;
  }

  async createCategory(data) {
    const doc = await categoryRepository.create(data);
    appCache.del(appCache.KEYS.CATEGORIES());
    appCache.flushPrefix('search:');
    appCache.flushPrefix('recommendations:');
    return toCategoryDTO(doc);
  }

  async deleteCategory(id) {
    const deleted = await categoryRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Brand with id "${id}" not found`);
    }
    appCache.del(appCache.KEYS.CATEGORIES());
    appCache.flushPrefix('search:');
    appCache.flushPrefix('recommendations:');
    return { message: 'Brand deleted successfully' };
  }
}

module.exports = new CategoryService();
