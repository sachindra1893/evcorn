const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

// Compound index on { type: 1, createdAt: 1 } for fast date-range aggregate queries at scale
eventSchema.index({ type: 1, createdAt: 1 });

module.exports = mongoose.model('Event', eventSchema);
