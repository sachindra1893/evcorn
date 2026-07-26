/**
 * Category / Brand Service
 */
const categoryRepository = require('../repositories/category.repository');
const { toCategoryDTO, toCategoryListDTO } = require('../dto/category.dto');
const { NotFoundError } = require('../errors/AppError');

class CategoryService {
  async getCategories() {
    const docs = await categoryRepository.findAll();
    return toCategoryListDTO(docs);
  }

  async createCategory(data) {
    const doc = await categoryRepository.create(data);
    return toCategoryDTO(doc);
  }

  async deleteCategory(id) {
    const deleted = await categoryRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Brand with id "${id}" not found`);
    }
    return { message: 'Brand deleted successfully' };
  }
}

module.exports = new CategoryService();
