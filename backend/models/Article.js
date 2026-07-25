const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  categoryId: { type: String, default: "general" },
  imageUrl: { type: String, default: "" },
  paragraphs: { type: [String], default: [] },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  // Cloudinary Image Metadata (Optional, Stores only URL & Public ID)
  cloudinaryImage: {
    url: { type: String, default: '' },
    public_id: { type: String, default: '' }
  },
  cloudinaryImages: [{
    url: { type: String, default: '' },
    public_id: { type: String, default: '' }
  }]
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
