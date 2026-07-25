const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  categoryId: { type: String, default: "general" },
  imageUrl: { type: String, default: "" },
  paragraphs: { type: [String], default: [] },
  blocks: { type: [mongoose.Schema.Types.Mixed], default: [] },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Ensure virtual id maps to _id for Angular compatibility
ArticleSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Article', ArticleSchema);
