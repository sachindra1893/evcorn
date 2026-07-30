/**
 * Article Service
 * Business logic, domain data transformation & repository orchestration for Articles.
 * Pillar I: In-process node-cache for read-heavy endpoints.
 * Phase 4: cache filtered/paginated GET lists via stable query fingerprints.
 */
const articleRepository = require('../repositories/article.repository');
const { deleteImage } = require('./upload.service');
const { parseQueryParams, buildArticleFilterQuery, formatResponse } = require('../utils/apiQuery');
const { toArticleDTO, toArticleListDTO, toArticleLightListDTO } = require('../dto/article.dto');
const { NotFoundError } = require('../errors/AppError');
const appCache = require('../utils/cache');
const perf = require('../utils/perf');

// Light projection: return only fields needed for article listing cards
// Exclude heavy body content (paragraphs, blocks) to cut payload by ~90%.
// `media` / `cloudinaryImage` are legacy mirrors of `imageUrl` and, for
// articles whose image was stored as an inline base64 data URI instead of a
// Cloudinary URL, each mirror re-embeds the full image (tens of KB to 200+KB)
// a second and third time. They are excluded here — nothing in the frontend
// reads them for listing cards — so Mongo never even transfers that data.
const ARTICLE_LIGHT_PROJECTION = {
  paragraphs: 0,
  blocks: 0,
  revisions: 0,
  'audit.archivedAt': 0,
  media: 0,
  cloudinaryImage: 0,
  cloudinaryImages: 0,
};

// Single-article (detail-page) projection: keep body content (paragraphs/
// blocks) since the detail page renders them, but still drop the legacy
// media/cloudinaryImage mirrors — the DTO no longer reads them (see
// dto/article.dto.js), so there's no reason to pull tens-to-hundreds of KB
// of duplicate base64 image data out of Mongo just to discard it.
const ARTICLE_SINGLE_PROJECTION = {
  revisions: 0,
  'audit.archivedAt': 0,
  media: 0,
  cloudinaryImage: 0,
  cloudinaryImages: 0,
};

function invalidateArticleCaches(id) {
  appCache.flushPrefix('articles:');
  appCache.flushPrefix('search:');
  appCache.flushPrefix('recommendations:');
  if (id) appCache.del(appCache.KEYS.ARTICLE_SINGLE(id));
}

/** Public visibility: active + published (or legacy missing status) + publishAt due. */
function isPubliclyVisibleArticle(doc) {
  if (!doc) return false;
  if (doc.active === false) return false;
  const status = doc.status;
  if (status && status !== 'published') return false;
  if (doc.publishAt && new Date(doc.publishAt) > new Date()) return false;
  return true;
}

class ArticleService {
  async getArticles(queryParams) {
    const isLight = queryParams.light === 'true';
    const { page, limit, sort, projection: customProjection, formatEnvelope } = parseQueryParams(queryParams);
    const filterQuery = buildArticleFilterQuery(queryParams);

    // Cache safe public GET lists including filtered/paginated shapes.
    // Phase 7: query.admin is ignored — never elevates filters from the client.
    const isCacheable = !customProjection;
    const fp = appCache.fingerprintQuery(queryParams, ['admin']);
    const envelopeSuffix = formatEnvelope ? ':envelope' : '';
    const cacheKey = isLight
      ? appCache.KEYS.ARTICLES_LIGHT(fp) + envelopeSuffix
      : appCache.KEYS.ARTICLES_ALL(fp) + envelopeSuffix;

    if (isCacheable) {
      const cached = appCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    // ── MongoDB Query ─────────────────────────────────────────────────────────
    const projection = customProjection || (isLight ? ARTICLE_LIGHT_PROJECTION : {});
    const skip = page && limit ? (page - 1) * limit : 0;
    const needsCount = Boolean(page && limit);

    const [docs, total] = await Promise.all([
      articleRepository.findAll(filterQuery, projection, sort || { createdAt: -1 }, skip, limit || 0),
      needsCount ? articleRepository.count(filterQuery) : Promise.resolve(0)
    ]);

    const dtos = isLight ? toArticleLightListDTO(docs) : toArticleListDTO(docs);
    const meta = needsCount ? { page, limit, total, pages: Math.ceil(total / limit) } : null;

    const result = formatResponse(dtos, meta, formatEnvelope);

    // ── Cache store ───────────────────────────────────────────────────────────
    if (isCacheable) {
      const ttl = isLight ? appCache.TTL.ARTICLES_LIGHT : appCache.TTL.ARTICLES_ALL;
      appCache.set(cacheKey, result, ttl);
    }

    return result;
  }

  async getArticleById(id) {
    perf.mark('service_entry');
    const cacheKey = appCache.KEYS.ARTICLE_SINGLE(id);
    const cached = appCache.get(cacheKey);
    perf.mark('cache_lookup');
    if (cached !== undefined) {
      perf.mark('cache_hit');
      return cached;
    }

    const doc = await articleRepository.findById(id, ARTICLE_SINGLE_PROJECTION);
    perf.mark('mongo_query');
    if (!doc) {
      throw new NotFoundError(`Article with id "${id}" not found`);
    }

    // Phase 7: public detail must not disclose drafts / inactive / future-dated articles.
    if (!isPubliclyVisibleArticle(doc)) {
      throw new NotFoundError(`Article with id "${id}" not found`);
    }

    const result = toArticleDTO(doc);
    perf.mark('dto_serialize');
    appCache.set(cacheKey, result, appCache.TTL.ARTICLE_SINGLE);
    perf.mark('cache_store');
    return result;
  }

  async createArticle(data) {
    // Defense-in-depth: if a client POST includes an existing article id
    // (e.g. mis-routed edit), update in place instead of minting a duplicate.
    const incomingId = data?.id != null && String(data.id).trim()
      ? String(data.id).trim()
      : (data?._id != null && String(data._id).trim() ? String(data._id).trim() : null);

    if (incomingId) {
      const { id: _ignoreId, _id: _ignoreMongoId, ...rest } = data;
      const existing = await articleRepository.findById(incomingId);
      if (existing) {
        const updated = await articleRepository.update(incomingId, rest);
        if (!updated) {
          throw new NotFoundError(`Article with id "${incomingId}" not found`);
        }
        invalidateArticleCaches(incomingId);
        return toArticleDTO(updated);
      }
    }

    const doc = await articleRepository.create(data);
    invalidateArticleCaches();
    return toArticleDTO(doc);
  }

  async updateArticle(id, data) {
    const updated = await articleRepository.update(id, data);
    if (!updated) {
      throw new NotFoundError(`Article with id "${id}" not found`);
    }
    invalidateArticleCaches(id);
    return toArticleDTO(updated);
  }

  async deleteArticle(id) {
    const deleted = await articleRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Article with id "${id}" not found`);
    }
    invalidateArticleCaches(id);

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
