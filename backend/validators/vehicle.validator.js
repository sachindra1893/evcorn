/**
 * Vehicle Input Validator
 */
const { BadRequestError } = require('../errors/AppError');

function validateVehicleInput(body) {
  if (!body || typeof body !== 'object') {
    throw new BadRequestError('Request body must be a valid JSON object.');
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    throw new BadRequestError('Vehicle field "name" is required.');
  }

  if (!body.categoryId || typeof body.categoryId !== 'string' || body.categoryId.trim().length === 0) {
    throw new BadRequestError('Vehicle field "categoryId" is required.');
  }

  return true;
}

module.exports = {
  validateVehicleInput
};
