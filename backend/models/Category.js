const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g. 'tesla'
  name: { type: String, required: true }              // e.g. 'Tesla'
});

CategorySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Category', CategorySchema);
