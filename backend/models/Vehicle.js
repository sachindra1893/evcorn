const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Custom string key, e.g. 'tesla-model-3'
  name: { type: String, required: true },
  categoryId: { type: String, required: true }, // Connects to the brand/category ID
  parentModel: { type: String, default: '' },
  variantName: { type: String, default: '' },
  price: { type: String, default: 'N/A' },
  seating: { type: String, default: 'N/A' },
  dimensions: { type: String, default: 'N/A' }, // Length x Width x Height
  groundClearance: { type: String, default: 'N/A' },
  batteryCapacity: { type: String, default: 'N/A' },
  range: { type: String, default: 'N/A' },
  tyreSize: { type: String, default: 'N/A' },
  bootFrunkSpace: { type: String, default: 'N/A' },
  bhpTorque: { type: String, default: 'N/A' },
  drivetrain: { type: String, default: 'N/A' },
  safetyRating: { type: String, default: 'N/A' },
  // Cloudinary Image Metadata (Optional, Stores only URL & Public ID)
  cloudinaryMainImage: {
    url: { type: String, default: '' },
    public_id: { type: String, default: '' }
  },
  cloudinaryImages: [{
    url: { type: String, default: '' },
    public_id: { type: String, default: '' }
  }]
});

// Clean up standard MongoDB keys for the frontend API response
VehicleSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Vehicle', VehicleSchema);
