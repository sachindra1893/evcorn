/**
 * Article Service
 * Business logic, domain data transformation & repository orchestration for Articles.
 * Pillar I: In-process node-cache for read-heavy endpoints.
 */
const articleRepository = require('../repositories/article.repository');
const { deleteImage } = require('./upload.service');
const { parseQueryParams, buildArticleFilterQuery, formatResponse } = require('../utils/apiQuery');
const { toArticleDTO, toArticleListDTO } = require('../dto/article.dto');
const { NotFoundError } = require('../errors/AppError');
const appCache = require('../utils/cache');

// Light projection: return only fields needed for article listing cards
// Exclude heavy body content (paragraphs, blocks) to cut payload by ~90%
const ARTICLE_LIGHT_PROJECTION = {
  paragraphs: 0,
  blocks: 0,
  revisions: 0,
  'audit.archivedAt': 0,
};

class ArticleService {
  async getArticles(queryParams) {
    const isLight = queryParams.light === 'true';
    const { page, limit, sort, projection: customProjection, formatEnvelope } = parseQueryParams(queryParams);
    const filterQuery = buildArticleFilterQuery(queryParams);

    // ── Cache lookup (skip for admin/paginated/filtered requests) ────────────
    const isCacheable = !page && !limit && !queryParams.search && !queryParams.category
      && !queryParams.admin;

    const cacheKey = isLight
      ? appCache.KEYS.ARTICLES_LIGHT()
      : appCache.KEYS.ARTICLES_ALL();

    if (isCacheable) {
      const cached = appCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    // ── MongoDB Query ─────────────────────────────────────────────────────────
    const projection = customProjection || (isLight ? ARTICLE_LIGHT_PROJECTION : {});
    const skip = page && limit ? (page - 1) * limit : 0;

    const [docs, total] = await Promise.all([
      articleRepository.findAll(filterQuery, projection, sort || { createdAt: -1 }, skip, limit || 0),
      articleRepository.count(filterQuery)
    ]);

    const dtos = toArticleListDTO(docs);
    const meta = page && limit ? { page, limit, total, pages: Math.ceil(total / limit) } : null;

    const result = formatResponse(dtos, meta, formatEnvelope);

    // ── Cache store ───────────────────────────────────────────────────────────
    if (isCacheable) {
      const ttl = isLight ? appCache.TTL.ARTICLES_LIGHT : appCache.TTL.ARTICLES_ALL;
      appCache.set(cacheKey, result, ttl);
    }

    return result;
  }

  async getArticleById(id) {
    const cacheKey = appCache.KEYS.ARTICLE_SINGLE(id);
    const cached = appCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const doc = await articleRepository.findById(id);
    if (!doc) {
      throw new NotFoundError(`Article with id "${id}" not found`);
    }

    const result = toArticleDTO(doc);
    appCache.set(cacheKey, result, appCache.TTL.ARTICLE_SINGLE);
    return result;
  }

  async createArticle(data) {
    const doc = await articleRepository.create(data);

    // ── Invalidate all article cache keys on write ────────────────────────────
    appCache.flushPrefix('articles:');

    return toArticleDTO(doc);
  }

  async updateArticle(id, data) {
    const updated = await articleRepository.update(id, data);
    if (!updated) {
      throw new NotFoundError(`Article with id "${id}" not found`);
    }

    // ── Invalidate cache ──────────────────────────────────────────────────────
    appCache.flushPrefix('articles:');
    appCache.del(appCache.KEYS.ARTICLE_SINGLE(id));

    return toArticleDTO(updated);
  }

  async deleteArticle(id) {
    const deleted = await articleRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Article with id "${id}" not found`);
    }

    // ── Invalidate cache ──────────────────────────────────────────────────────
    appCache.flushPrefix('articles:');
    appCache.del(appCache.KEYS.ARTICLE_SINGLE(id));

    try {
      const imgToDelete = deleted.cloudinaryImage?.public_id || deleted.cloudinaryImage?.url || deleted.imageUrl;
      if (imgToDelete && imgToDelete.includes('cloudinary')) {
        await deleteImage(imgToDelete);
      }
    } catch (cleanErr) {
      // Safe cleanup
    }

    return { message: 'Article deleted successfully' };
  }
}

module.exports = new ArticleService();
