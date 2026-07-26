/**
 * Article Enterprise Domain Model
 * Enhanced for Phase 11 Editorial Workflow, Authorship, SEO, and Audit Trail.
 */
const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, trim: true, index: true },
  description: { type: String, default: "" },
  categoryId: { type: String, default: "general" },
  imageUrl: { type: String, default: "" },
  paragraphs: { type: [String], default: [] },
  active: { type: Boolean, default: true },
  
  // Editorial Workflow Status
  status: {
    type: String,
    enum: ['draft', 'in_review', 'published', 'scheduled', 'archived'],
    default: 'published',
    index: true
  },
  publishAt: { type: Date, default: Date.now, index: true },

  // Enhanced Author Profile
  author: {
    name: { type: String, default: 'EVCorn Editorial Team' },
    role: { type: String, default: 'EV Content Strategist' },
    bio: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    socialLinks: {
      twitter: { type: String, default: '' },
      linkedin: { type: String, default: '' }
    }
  },

  // Media Metadata
  media: {
    url: { type: String, default: '' },
    alt: { type: String, default: '' },
    caption: { type: String, default: '' },
    credit: { type: String, default: '' },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    public_id: { type: String, default: '' }
  },

  // Enhanced SEO Metadata
  seo: {
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    canonicalUrl: { type: String, default: '' },
    noindex: { type: Boolean, default: false }
  },

  // Content Relationships
  relationships: {
    relatedArticleIds: { type: [String], default: [] },
    relatedVehicleIds: { type: [String], default: [] },
    relatedBrandIds: { type: [String], default: [] }
  },

  // Audit Trail & Revision History
  audit: {
    createdBy: { type: String, default: 'admin' },
    updatedBy: { type: String, default: 'admin' },
    publishedBy: { type: String, default: 'admin' },
    publishedAt: { type: Date, default: Date.now },
    archivedAt: { type: Date }
  },
  revisions: [{
    updatedBy: { type: String, default: 'admin' },
    updatedAt: { type: Date, default: Date.now },
    summaryOfChanges: { type: String, default: 'Content update' }
  }],

  createdAt: { type: Date, default: Date.now },

  // Cloudinary Image Metadata (Backward Compatibility)
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
