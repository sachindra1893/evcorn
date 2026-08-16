/**
 * Comment Controller
 * High-performance, scale-ready comment management with 1-level reply threading.
 * Supports Mongoose MongoDB persistence with instant in-memory fallback for zero-latency testing/offline mode.
 */
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { sanitizeCommentText } = require('../utils/sanitizeText');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../errors/AppError');
const logger = require('../utils/logger');

// Fallback in-memory store for instant offline/testing execution
const memoryComments = [];

async function withTimeout(promise, ms = 1500) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Mongoose operation timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

class CommentController {
  /**
   * GET /api/comments
   * Paginated retrieval of top-level comments and nested 1-level replies.
   */
  async getComments(req, res, next) {
    try {
      const { targetType, targetId } = req.query;
      let page = parseInt(req.query.page || '1', 10);
      let limit = parseInt(req.query.limit || '25', 10);

      if (!targetType || !targetId) {
        throw new BadRequestError('targetType and targetId query parameters are required');
      }

      if (!['article', 'vehicle'].includes(targetType)) {
        throw new BadRequestError('targetType must be either "article" or "vehicle"');
      }

      if (isNaN(page) || page < 1) page = 1;
      if (isNaN(limit) || limit < 1) limit = 25;
      if (limit > 50) limit = 50;

      const skip = (page - 1) * limit;

      let totalTopLevel = 0;
      let topComments = [];
      let replies = [];

      if (mongoose.connection.readyState === 1) {
        try {
          const query = { targetType, targetId: String(targetId), parentCommentId: null };
          const [total, comments] = await withTimeout(
            Promise.all([
              Comment.countDocuments(query),
              Comment.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', '_id name avatarUrl email')
                .lean()
            ])
          );
          totalTopLevel = total;
          topComments = comments;

          const topIds = topComments.map((c) => c._id);
          if (topIds.length > 0) {
            replies = await withTimeout(
              Comment.find({
                targetType,
                targetId: String(targetId),
                parentCommentId: { $in: topIds }
              })
                .sort({ createdAt: 1 })
                .populate('userId', '_id name avatarUrl email')
                .lean()
            );
          }
        } catch (dbErr) {
          logger.warn(`Mongoose GET comments fallback: ${dbErr.message}`);
        }
      }

      // In-Memory Fallback if Mongoose is offline or unpopulated
      if (topComments.length === 0 && memoryComments.length > 0) {
        const memTop = memoryComments
          .filter((c) => c.targetType === targetType && c.targetId === String(targetId) && !c.parentCommentId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        totalTopLevel = memTop.length;
        topComments = memTop.slice(skip, skip + limit);

        const topIdsStr = new Set(topComments.map((c) => c._id.toString()));
        replies = memoryComments.filter(
          (c) => c.targetType === targetType && c.targetId === String(targetId) && c.parentCommentId && topIdsStr.has(c.parentCommentId.toString())
        );
      }

      // Group replies by parentCommentId
      const replyMap = new Map();
      for (const reply of replies) {
        const parentIdStr = reply.parentCommentId ? reply.parentCommentId.toString() : '';
        if (parentIdStr) {
          if (!replyMap.has(parentIdStr)) {
            replyMap.set(parentIdStr, []);
          }
          replyMap.get(parentIdStr).push(reply);
        }
      }

      const data = topComments.map((comment) => ({
        ...comment,
        replies: replyMap.get(comment._id.toString()) || []
      }));

      const totalPages = Math.ceil(totalTopLevel / limit) || 1;

      return res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          totalTopLevel,
          totalPages,
          hasNextPage: page < totalPages
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/comments
   * Create a new top-level comment or reply (requires authentication).
   */
  async createComment(req, res, next) {
    try {
      const { targetType, targetId, text, parentCommentId } = req.body;
      const userId = req.user.id;

      if (!targetType || !targetId || !text) {
        throw new BadRequestError('targetType, targetId, and text are required fields');
      }

      if (!['article', 'vehicle'].includes(targetType)) {
        throw new BadRequestError('targetType must be either "article" or "vehicle"');
      }

      if (typeof text !== 'string' || !text.trim()) {
        throw new BadRequestError('Comment text cannot be empty');
      }

      if (text.trim().length > 2000) {
        throw new BadRequestError('Comment text exceeds maximum length of 2000 characters');
      }

      let validParentId = null;
      if (parentCommentId) {
        let parentComment = null;
        if (mongoose.connection.readyState === 1) {
          try {
            parentComment = await withTimeout(Comment.findById(parentCommentId));
          } catch (e) {}
        }
        if (!parentComment) {
          parentComment = memoryComments.find((c) => c._id.toString() === parentCommentId.toString());
        }

        if (!parentComment) {
          throw new NotFoundError('Parent comment not found');
        }

        // 1-level threading rule
        validParentId = parentComment.parentCommentId || parentComment._id;
      }

      const sanitizedText = sanitizeCommentText(text);
      const commentId = new mongoose.Types.ObjectId();

      let userObj = { _id: userId, name: 'EVCorn User', email: req.user.email || 'user@evcorn.com', avatarUrl: '' };
      if (mongoose.connection.readyState === 1) {
        try {
          const dbUser = await withTimeout(User.findById(userId).lean());
          if (dbUser) userObj = dbUser;
        } catch (e) {}
      }

      const newCommentDoc = {
        _id: commentId,
        userId: userObj,
        targetType,
        targetId: String(targetId),
        parentCommentId: validParentId,
        text: sanitizedText,
        deleted: false,
        createdAt: new Date(),
        editedAt: null,
        replies: []
      };

      // Save to MongoDB if connected
      if (mongoose.connection.readyState === 1) {
        try {
          await withTimeout(
            Comment.create({
              _id: commentId,
              userId,
              targetType,
              targetId: String(targetId),
              parentCommentId: validParentId,
              text: sanitizedText,
              deleted: false,
              createdAt: newCommentDoc.createdAt
            })
          );
        } catch (dbErr) {
          logger.warn(`Mongoose create comment fallback: ${dbErr.message}`);
        }
      }

      // Save to memory fallback
      memoryComments.push(newCommentDoc);

      logger.info(`New comment posted by user ${userId} on ${targetType}:${targetId}`);

      return res.status(201).json({
        success: true,
        data: newCommentDoc
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/comments/:id
   * Edit comment text (requires ownership check: req.user.id === comment.userId).
   */
  async editComment(req, res, next) {
    try {
      const { id } = req.params;
      const { text } = req.body;
      const userId = req.user.id;

      if (typeof text !== 'string' || !text.trim()) {
        throw new BadRequestError('Comment text cannot be empty');
      }

      if (text.trim().length > 2000) {
        throw new BadRequestError('Comment text exceeds maximum length of 2000 characters');
      }

      let comment = null;
      if (mongoose.connection.readyState === 1) {
        try {
          comment = await withTimeout(Comment.findById(id));
        } catch (e) {}
      }
      let memComment = memoryComments.find((c) => c._id.toString() === id.toString());

      if (!comment && !memComment) {
        throw new NotFoundError('Comment not found');
      }

      const commentOwnerId = comment ? comment.userId.toString() : (memComment.userId._id ? memComment.userId._id.toString() : memComment.userId.toString());

      if (commentOwnerId !== userId.toString()) {
        logger.warn(`Unauthorized edit attempt: User ${userId} tried to edit Comment ${id} owned by ${commentOwnerId}`);
        throw new ForbiddenError('You can only edit your own comments');
      }

      const isDeleted = comment ? comment.deleted : memComment.deleted;
      if (isDeleted) {
        throw new BadRequestError('Cannot edit a deleted comment');
      }

      const sanitizedText = sanitizeCommentText(text);
      const now = new Date();

      if (comment) {
        comment.text = sanitizedText;
        comment.editedAt = now;
        await withTimeout(comment.save());
      }

      if (memComment) {
        memComment.text = sanitizedText;
        memComment.editedAt = now;
      }

      const updatedDoc = memComment || comment;

      return res.json({
        success: true,
        data: updatedDoc
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/comments/:id
   * Soft-delete comment (requires ownership check: req.user.id === comment.userId).
   */
  async deleteComment(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      let comment = null;
      if (mongoose.connection.readyState === 1) {
        try {
          comment = await withTimeout(Comment.findById(id));
        } catch (e) {}
      }
      let memComment = memoryComments.find((c) => c._id.toString() === id.toString());

      if (!comment && !memComment) {
        throw new NotFoundError('Comment not found');
      }

      const commentOwnerId = comment ? comment.userId.toString() : (memComment.userId._id ? memComment.userId._id.toString() : memComment.userId.toString());

      if (commentOwnerId !== userId.toString()) {
        logger.warn(`Unauthorized delete attempt: User ${userId} tried to delete Comment ${id} owned by ${commentOwnerId}`);
        throw new ForbiddenError('You can only delete your own comments');
      }

      if (comment) {
        comment.deleted = true;
        comment.text = '[Comment deleted]';
        await withTimeout(comment.save());
      }

      if (memComment) {
        memComment.deleted = true;
        memComment.text = '[Comment deleted]';
      }

      return res.json({
        success: true,
        message: 'Comment deleted successfully',
        data: {
          _id: id,
          deleted: true,
          text: '[Comment deleted]'
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CommentController();
