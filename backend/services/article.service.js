/**
 * Article Service
 * Business logic, domain data transformation & repository orchestration for Articles.
 */
const articleRepository = require('../repositories/article.repository');
const { deleteImage } = require('./upload.service');
const { parseQueryParams, buildArticleFilterQuery, formatResponse } = require('../utils/apiQuery');
const { toArticleDTO, toArticleListDTO } = require('../dto/article.dto');
const { NotFoundError } = require('../errors/AppError');

class ArticleService {
  async getArticles(queryParams) {
    const isLight = queryParams.light === 'true';
    const { page, limit, sort, projection: customProjection, formatEnvelope } = parseQueryParams(queryParams);
    const filterQuery = buildArticleFilterQuery(queryParams);

    const projection = customProjection || (isLight ? { paragraphs: 0, blocks: 0, imageUrl: 0 } : {});
    const skip = page && limit ? (page - 1) * limit : 0;

    const [docs, total] = await Promise.all([
      articleRepository.findAll(filterQuery, projection, sort || { createdAt: -1 }, skip, limit || 0),
      articleRepository.count(filterQuery)
    ]);

    const dtos = toArticleListDTO(docs);
    const meta = page && limit ? { page, limit, total, pages: Math.ceil(total / limit) } : null;

    return formatResponse(dtos, meta, formatEnvelope);
  }

  async getArticleById(id) {
    const doc = await articleRepository.findById(id);
    if (!doc) {
      throw new NotFoundError(`Article with id "${id}" not found`);
    }
    return toArticleDTO(doc);
  }

  async createArticle(data) {
    const doc = await articleRepository.create(data);
    return toArticleDTO(doc);
  }

  async updateArticle(id, data) {
    const updated = await articleRepository.update(id, data);
    if (!updated) {
      throw new NotFoundError(`Article with id "${id}" not found`);
    }
    return toArticleDTO(updated);
  }

  async deleteArticle(id) {
    const deleted = await articleRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Article with id "${id}" not found`);
    }

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
