/**
 * Comment Routes Definition
 */
const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { requireUserAuth } = require('../middlewares/userAuth.middleware');
const { commentPostLimiter } = require('../middlewares/rateLimit.middleware');

// Public List & Pagination
router.get('/', commentController.getComments);

// Protected Actions
router.post('/', requireUserAuth, commentPostLimiter, commentController.createComment);
router.patch('/:id', requireUserAuth, commentController.editComment);
router.delete('/:id', requireUserAuth, commentController.deleteComment);

module.exports = router;
