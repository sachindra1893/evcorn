/**
 * Category / Brand Controller
 */
const categoryService = require('../services/category.service');
const { BadRequestError } = require('../errors/AppError');

class CategoryController {
  async getCategories(req, res, next) {
    try {
      const result = await categoryService.getCategories();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async createCategory(req, res, next) {
    try {
      const { id, name } = req.body;
      if (!id || !name) {
        throw new BadRequestError('Brand fields "id" and "name" are required.');
      }
      const result = await categoryService.createCategory({ id, name });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      const result = await categoryService.deleteCategory(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CategoryController();
