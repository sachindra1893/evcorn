/**
 * Article Input Validator
 */
const { BadRequestError } = require('../errors/AppError');

function validateArticleInput(body) {
  if (!body || typeof body !== 'object') {
    throw new BadRequestError('Request body must be a valid JSON object.');
  }

  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    throw new BadRequestError('Article field "title" is required.');
  }

  return true;
}

module.exports = {
  validateArticleInput
};
