/**
 * Article Input & Publication Validator
 */
const { BadRequestError } = require('../errors/AppError');
const { assertNoDataImageInArticle } = require('../utils/articleImageSanitize');

function validateArticleInput(body) {
  if (!body || typeof body !== 'object') {
    throw new BadRequestError('Request body must be a valid JSON object.');
  }

  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    throw new BadRequestError('Article field "title" is required.');
  }

  // Never persist Base64 images in cover or __EVBLOCKS__ body.
  assertNoDataImageInArticle(body);

  // Publication Validation Guard
  if (body.status === 'published') {
    if (!body.description || body.description.trim().length < 10) {
      throw new BadRequestError('Publishing requires a valid description (minimum 10 characters).');
    }
    if (!body.categoryId) {
      throw new BadRequestError('Publishing requires a valid categoryId.');
    }
  }

  return true;
}

module.exports = {
  validateArticleInput
};
