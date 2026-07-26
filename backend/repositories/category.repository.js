/**
 * Category / Brand Repository
 */
const Category = require('../models/Category');
const { isLocalFileDb, fileDb } = require('../config/database');

class CategoryRepository {
  async findAll() {
    if (isLocalFileDb()) {
      return fileDb.getCategories().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return await Category.find().sort({ name: 1 }).lean();
  }

  async findById(id) {
    if (isLocalFileDb()) {
      const categories = fileDb.getCategories();
      return categories.find(c => c.id === id) || null;
    }
    return await Category.findOne({ id }).lean();
  }

  async create(catData) {
    if (isLocalFileDb()) {
      const categories = fileDb.getCategories();
      if (categories.some(c => c.id === catData.id)) {
        throw new Error('Brand ID already exists');
      }
      categories.push(catData);
      fileDb.saveCategories(categories);
      return catData;
    }

    const doc = new Category(catData);
    const saved = await doc.save();
    return saved.toObject();
  }

  async delete(id) {
    if (isLocalFileDb()) {
      let categories = fileDb.getCategories();
      const index = categories.findIndex(c => c.id === id);
      if (index === -1) return null;
      const deleted = categories[index];
      categories.splice(index, 1);
      fileDb.saveCategories(categories);
      return deleted;
    }

    return await Category.findOneAndDelete({ id }).lean();
  }
}

module.exports = new CategoryRepository();
