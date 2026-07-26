/**
 * Article Routes Definition
 */
const express = require('express');
const router = express.Router();
const articleController = require('../controllers/article.controller');
const { checkAdminAuth } = require('../middlewares/auth.middleware');

router.get('/', articleController.getArticles);
router.get('/:id', articleController.getArticleById);
router.post('/', checkAdminAuth, articleController.createArticle);
router.put('/:id', checkAdminAuth, articleController.updateArticle);
router.delete('/:id', checkAdminAuth, articleController.deleteArticle);

module.exports = router;
