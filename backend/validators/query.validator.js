/**
 * Query Parameter Validator & Sanitizer
 */
const { BadRequestError } = require('../errors/AppError');
const { PAGINATION } = require('../constants/api.constants');

function validateQuery(query) {
  if (query.page) {
    const page = parseInt(query.page, 10);
    if (isNaN(page) || page < 1) {
      throw new BadRequestError('Query parameter "page" must be a positive integer >= 1.');
    }
  }

  if (query.limit) {
    const limit = parseInt(query.limit, 10);
    if (isNaN(limit) || limit < 1) {
      throw new BadRequestError('Query parameter "limit" must be a positive integer >= 1.');
    }
  }

  if (query.priceMin && isNaN(parseFloat(query.priceMin))) {
    throw new BadRequestError('Query parameter "priceMin" must be a valid number.');
  }

  if (query.priceMax && isNaN(parseFloat(query.priceMax))) {
    throw new BadRequestError('Query parameter "priceMax" must be a valid number.');
  }

  if (query.rangeMin && isNaN(parseFloat(query.rangeMin))) {
    throw new BadRequestError('Query parameter "rangeMin" must be a valid number.');
  }

  if (query.rangeMax && isNaN(parseFloat(query.rangeMax))) {
    throw new BadRequestError('Query parameter "rangeMax" must be a valid number.');
  }

  return true;
}

module.exports = {
  validateQuery
};
