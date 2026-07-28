/**
 * Article Controller
 */
const articleService = require('../services/article.service');
const { validateQuery } = require('../validators/query.validator');
const { validateArticleInput } = require('../validators/article.validator');
const perf = require('../utils/perf');
const logger = require('../utils/logger');

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
      perf.mark('controller_entry');
      const result = await articleService.getArticleById(req.params.id);
      perf.mark('controller_after_service');

      const timingHeader = perf.buildServerTimingHeader();
      if (timingHeader) res.set('Server-Timing', timingHeader);

      // Server-Timing headers must go out before the body, so they can only
      // cover work up to this point. The remaining cost — JSON.stringify +
      // gzip/brotli compression + writing the socket — happens *after*
      // res.json() is called and is only observable via the `finish` event.
      // Logged separately (not a header) purely for diagnostic purposes.
      if (process.env.PERF_TRACE_LOG === 'true') {
        const beforeSend = process.hrtime.bigint();
        const breakdown = perf.getBreakdown();
        res.once('finish', () => {
          const sendMs = Number(process.hrtime.bigint() - beforeSend) / 1e6;
          logger.info(`Perf trace GET /api/articles/${req.params.id}`, {
            breakdown,
            serializeCompressTransferMs: Number(sendMs.toFixed(2)),
            responseBytesSent: Number(res.getHeader('content-length')) || undefined
          });
        });
      }

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
