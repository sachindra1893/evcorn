const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    targetType: {
      type: String,
      enum: ['article', 'vehicle'],
      required: true
    },
    targetId: {
      type: String,
      required: true
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    text: {
      type: String,
      required: true,
      maxlength: 2000,
      trim: true
    },
    deleted: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    editedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: false
  }
);

// Fast lookups for page comments & reply threads
commentSchema.index({ targetType: 1, targetId: 1, parentCommentId: 1, createdAt: -1 });
commentSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
