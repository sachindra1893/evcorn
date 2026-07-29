const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g. 'tesla'
  name: { type: String, required: true, index: true }, // e.g. 'Tesla' — autocomplete brand match
  logoUrl: { type: String, default: '' },
  // Cloudinary Logo Metadata (Optional, Stores only URL & Public ID)
  cloudinaryLogo: {
    url: { type: String, default: '' },
    public_id: { type: String, default: '' }
  }
});

CategorySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Category', CategorySchema);
