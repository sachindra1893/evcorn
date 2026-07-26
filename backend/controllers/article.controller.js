/**
 * Article Controller
 */
const articleService = require('../services/article.service');
const { validateQuery } = require('../validators/query.validator');
const { validateArticleInput } = require('../validators/article.validator');

class ArticleController {
  async getArticles(req, res, next) {
    try {
      validateQuery(req.query);
      const result = await articleService.getArticles(req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getArticleById(req, res, next) {
    try {
      const result = await articleService.getArticleById(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async createArticle(req, res, next) {
    try {
      validateArticleInput(req.body);
      const result = await articleService.createArticle(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateArticle(req, res, next) {
    try {
      const result = await articleService.updateArticle(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteArticle(req, res, next) {
    try {
      const result = await articleService.deleteArticle(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ArticleController();
