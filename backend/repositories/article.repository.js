/**
 * Article Repository
 * Handles ONLY raw database queries for Articles. Zero business logic.
 * Phase 5.3: File-DB path uses shared query matcher (filters/projection/pagination).
 */
const Article = require('../models/Article');
const { isLocalFileDb, fileDb } = require('../config/database');
const { measureQuery } = require('../utils/slowQuery.utils');
const { queryDocuments, countDocuments, projectDocument } = require('../utils/fileDbQuery');

class ArticleRepository {
  async findAll(filterQuery, projection, sort, skip = 0, limit = 0) {
    if (isLocalFileDb()) {
      return queryDocuments(
        fileDb.getArticles(),
        filterQuery || {},
        projection,
        sort || { createdAt: -1 },
        skip,
        limit
      );
    }

    return await measureQuery('Article.findAll', async () => {
      let query = Article.find(filterQuery, projection).sort(sort).lean();
      if (skip > 0) query = query.skip(skip);
      if (limit > 0) query = query.limit(limit);
      return await query;
    }, { filterQuery });
  }

  async count(filterQuery) {
    if (isLocalFileDb()) {
      return countDocuments(fileDb.getArticles(), filterQuery || {});
    }
    return await measureQuery('Article.count', async () => {
      return await Article.countDocuments(filterQuery);
    }, { filterQuery });
  }

  async findById(id, projection = null) {
    if (isLocalFileDb()) {
      const articles = fileDb.getArticles();
      const doc = articles.find(a => a.id === id) || null;
      if (!doc || !projection) return doc;
      return projectDocument(doc, projection);
    }

    const mongoose = require('mongoose');
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    return await measureQuery('Article.findById', async () => {
      return await Article.findById(id, projection).lean();
    }, { id });
  }

  async create(articleData) {
    if (isLocalFileDb()) {
      const articles = fileDb.getArticles().slice();
      const now = new Date().toISOString();
      const newArticle = {
        createdAt: articleData.createdAt || articleData.publishAt || now,
        updatedAt: articleData.updatedAt || now,
        ...articleData,
        id: 'local-art-' + Date.now()
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
    const updatedAt = new Date().toISOString();
    if (isLocalFileDb()) {
      const articles = fileDb.getArticles().slice();
      const index = articles.findIndex(a => a.id === id);
      if (index === -1) return null;
      articles[index] = { ...articles[index], ...articleData, updatedAt };
      fileDb.saveArticles(articles);
      return articles[index];
    }

    return await Article.findByIdAndUpdate(
      id,
      { ...articleData, updatedAt: new Date() },
      { new: true }
    ).lean();
  }

  async delete(id) {
    if (isLocalFileDb()) {
      let articles = fileDb.getArticles().slice();
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
