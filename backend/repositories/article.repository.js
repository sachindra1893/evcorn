/**
 * Article Repository
 * Handles ONLY raw database queries for Articles. Zero business logic.
 */
const Article = require('../models/Article');
const { isLocalFileDb, fileDb } = require('../config/database');

class ArticleRepository {
  async findAll(filterQuery, projection, sort, skip = 0, limit = 0) {
    if (isLocalFileDb()) {
      let articles = fileDb.getArticles();
      if (filterQuery.categoryId) {
        articles = articles.filter(a => a.categoryId === filterQuery.categoryId);
      }
      if (filterQuery.active !== undefined) {
        articles = articles.filter(a => a.active === filterQuery.active);
      }
      if (limit > 0) {
        articles = articles.slice(skip, skip + limit);
      }
      return articles;
    }

    let query = Article.find(filterQuery, projection).sort(sort).lean();
    if (skip > 0) query = query.skip(skip);
    if (limit > 0) query = query.limit(limit);
    return await query;
  }

  async count(filterQuery) {
    if (isLocalFileDb()) {
      const articles = fileDb.getArticles();
      return articles.length;
    }
    return await Article.countDocuments(filterQuery);
  }

  async findById(id) {
    if (isLocalFileDb()) {
      const articles = fileDb.getArticles();
      return articles.find(a => a.id === id) || null;
    }

    const mongoose = require('mongoose');
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    return await Article.findById(id).lean();
  }

  async create(articleData) {
    if (isLocalFileDb()) {
      const articles = fileDb.getArticles();
      const newArticle = {
        ...articleData,
        id: 'local-art-' + Date.now(),
        createdAt: new Date().toISOString()
      };
      articles.unshift(newArticle);
      fileDb.saveArticles(articles);
      return newArticle;
    }

    const doc = new Article(articleData);
    const saved = await doc.save();
    return saved.toObject();
  }

  async update(id, articleData) {
    if (isLocalFileDb()) {
      const articles = fileDb.getArticles();
      const index = articles.findIndex(a => a.id === id);
      if (index === -1) return null;
      articles[index] = { ...articles[index], ...articleData };
      fileDb.saveArticles(articles);
      return articles[index];
    }

    return await Article.findByIdAndUpdate(id, articleData, { new: true }).lean();
  }

  async delete(id) {
    if (isLocalFileDb()) {
      let articles = fileDb.getArticles();
      const index = articles.findIndex(a => a.id === id);
      if (index === -1) return null;
      const deleted = articles[index];
      articles.splice(index, 1);
      fileDb.saveArticles(articles);
      return deleted;
    }

    return await Article.findByIdAndDelete(id).lean();
  }
}

module.exports = new ArticleRepository();
