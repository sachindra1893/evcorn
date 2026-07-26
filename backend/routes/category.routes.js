/**
 * Category / Brand Routes Definition
 */
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { checkAdminAuth } = require('../middlewares/auth.middleware');

router.get('/', categoryController.getCategories);
router.post('/', checkAdminAuth, categoryController.createCategory);
router.delete('/:id', checkAdminAuth, categoryController.deleteCategory);

module.exports = router;
