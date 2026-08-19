const mongoose = require('mongoose');

// Enterprise Sub-Document Schemas
const PricingSchema = new mongoose.Schema({
  exShowroomPriceINR: { type: Number, min: 0, default: 0 },
  priceText: { type: String, default: 'N/A' },
  onRoadPriceEstINR: { type: Number, min: 0, default: 0 },
  subsidyEligible: { type: Boolean, default: false }
}, { _id: false });

const BatterySchema = new mongoose.Schema({
  capacityKWh: { type: Number, min: 0, default: 0 },
  capacityText: { type: String, default: 'N/A' },
  chemistry: { type: String, enum: ['LFP', 'NMC', 'Sodium-Ion', 'Solid-State', 'Unknown'], default: 'Unknown' },
  voltageArchitecture: { type: Number, default: 400 }
}, { _id: false });

const ChargingSchema = new mongoose.Schema({
  acChargingKW: { type: Number, min: 0, default: 0 },
  dcFastChargingKW: { type: Number, min: 0, default: 0 },
  acChargingText: { type: String, default: 'N/A' },
  dcChargingText: { type: String, default: 'N/A' },
  portType: { type: String, default: 'CCS2' }
}, { _id: false });

const PerformanceSchema = new mongoose.Schema({
  claimedRangeKM: { type: Number, min: 0, default: 0 },
  rangeText: { type: String, default: 'N/A' },
  maxPowerBHP: { type: Number, min: 0, default: 0 },
  maxTorqueNM: { type: Number, min: 0, default: 0 },
  acceleration0to100Sec: { type: Number, min: 0, default: 0 },
  acceleration0to40Sec: { type: Number, min: 0, default: 0 },
  topSpeedKMH: { type: Number, min: 0, default: 0 },
  drivetrain: { type: String, enum: ['FWD', 'RWD', 'AWD', 'FWD/AWD', 'N/A'], default: 'FWD' }
}, { _id: false });

const DimensionsSchema = new mongoose.Schema({
  lengthMM: { type: Number, min: 0, default: 0 },
  widthMM: { type: Number, min: 0, default: 0 },
  heightMM: { type: Number, min: 0, default: 0 },
  dimensionsText: { type: String, default: 'N/A' },
  groundClearanceMM: { type: Number, min: 0, default: 0 },
  groundClearanceText: { type: String, default: 'N/A' },
  wheelbaseMM: { type: Number, min: 0, default: 0 },
  kerbWeightKG: { type: Number, min: 0, default: 0 },
  grossWeightKG: { type: Number, min: 0, default: 0 },
  bootSpaceLiters: { type: Number, min: 0, default: 0 },
  frunkSpaceLiters: { type: Number, min: 0, default: 0 },
  bootFrunkText: { type: String, default: 'N/A' },
  seatingCapacity: { type: Number, min: 1, max: 10, default: 5 },
  seatingText: { type: String, default: '5 Seater' },
  tyreSize: { type: String, default: 'N/A' },
  wheelSize: { type: String, default: 'N/A' }
}, { _id: false });

const MediaSchema = new mongoose.Schema({
  mainImage: { type: String, default: '' },
  gallery: [{ type: String }],
  cloudinaryMainImage: {
    url: { type: String, default: '' },
    public_id: { type: String, default: '' }
  },
  cloudinaryImages: [{
    url: { type: String, default: '' },
    public_id: { type: String, default: '' }
  }]
}, { _id: false });

const SafetySchema = new mongoose.Schema({
  ncapRating: { type: Number, min: 0, max: 5, default: 0 },
  safetyRatingText: { type: String, default: 'N/A' },
  ncapTestingBody: { type: String, default: 'N/A' },
  airbagsCount: { type: Number, min: 0, default: 0 },
  hasADAS: { type: Boolean, default: false }
}, { _id: false });

const SEOSchema = new mongoose.Schema({
  metaTitle: { type: String, default: '' },
  metaDescription: { type: String, default: '' }
}, { _id: false });

const VehicleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  categoryId: { type: String, required: true, index: true },
  vehicleType: { type: String, enum: ['car', 'two-wheeler'], default: 'car', index: true },
  // Stable Domain Hierarchy Slugs & Identifiers
  brandSlug: { type: String, default: '', index: true },
  modelId: { type: String, default: '', index: true },
  modelSlug: { type: String, default: '', index: true },
  variantId: { type: String, default: '', index: true },
  variantSlug: { type: String, default: '', index: true },
  
  // Legacy Flat Fallbacks (Preserved for 100% Backward API Compatibility)
  price: { type: String, default: 'N/A' },
  seating: { type: String, default: 'N/A' },
  dimensions: { type: String, default: 'N/A' },
  groundClearance: { type: String, default: 'N/A' },
  batteryCapacity: { type: String, default: 'N/A' },
  range: { type: String, default: 'N/A' },
  tyreSize: { type: String, default: 'N/A' },
  bootFrunkSpace: { type: String, default: 'N/A' },
  bhpTorque: { type: String, default: 'N/A' },
  bhp: { type: String, default: 'N/A' },
  torque: { type: String, default: 'N/A' },
  topSpeed: { type: String, default: 'N/A' },
  acceleration: { type: String, default: 'N/A' },
  bootSpace: { type: String, default: 'N/A' },
  wheelSize: { type: String, default: 'N/A' },
  kerbWeight: { type: String, default: 'N/A' },
  grossWeight: { type: String, default: 'N/A' },
  drivetrain: { type: String, default: 'N/A' },
  safetyRating: { type: String, default: 'N/A' },
  imageUrl: { type: String, default: '' },
  keyHighlights: { type: String, default: '' },

  // Cloudinary Legacy Fields
  cloudinaryMainImage: {
    url: { type: String, default: '' },
    public_id: { type: String, default: '' }
  },
  cloudinaryImages: [{
    url: { type: String, default: '' },
    public_id: { type: String, default: '' }
  }],

  // New Enterprise Domain Nested Sub-Documents
  pricing: { type: PricingSchema, default: () => ({}) },
  battery: { type: BatterySchema, default: () => ({}) },
  charging: { type: ChargingSchema, default: () => ({}) },
  performance: { type: PerformanceSchema, default: () => ({}) },
  dimensionsObj: { type: DimensionsSchema, default: () => ({}) },
  media: { type: MediaSchema, default: () => ({}) },
  safety: { type: SafetySchema, default: () => ({}) },
  seo: { type: SEOSchema, default: () => ({}) },
  
  status: { type: String, enum: ['Launched', 'Upcoming'], default: 'Launched', index: true },
  publishedAt: { type: Date, default: Date.now, index: true },
  launchDate: { type: String, default: '' },
  isLaunchDateOverride: { type: Boolean, default: false },

  bodyStyle: { type: String, enum: ['SUV', 'Hatchback', 'Sedan', 'MPV', 'Sports', null], default: null, index: true }
}, {
  timestamps: true
});

// ─── Compound Indexes (Pillar III — Production Query Optimisation) ─────────────
// These match the exact query patterns executed in vehicle.service.js

// Browse filter: vehicleType + brand + status sorted by range
VehicleSchema.index({ vehicleType: 1, categoryId: 1, status: 1, 'performance.claimedRangeKM': -1 });

// Browse filter: brand + status sorted by range (most common query on /evs page)
VehicleSchema.index({ categoryId: 1, status: 1, 'performance.claimedRangeKM': -1 });

// Price range filter + status (budget filter on browse page)
VehicleSchema.index({ vehicleType: 1, 'pricing.exShowroomPriceINR': 1, status: 1 });
VehicleSchema.index({ 'pricing.exShowroomPriceINR': 1, status: 1 });

// Top-range query
VehicleSchema.index({ vehicleType: 1, 'performance.claimedRangeKM': -1, status: 1 });
VehicleSchema.index({ 'performance.claimedRangeKM': -1, status: 1 });

// Battery capacity filter + status
VehicleSchema.index({ 'battery.capacityKWh': -1, status: 1 });

// Default published listing sort by name
VehicleSchema.index({ status: 1, name: 1 });

// Slug-based lookups (brandSlug + modelSlug + variantSlug)
VehicleSchema.index({ brandSlug: 1, modelSlug: 1, variantSlug: 1 }, { sparse: true });

// Publish date sort
VehicleSchema.index({ status: 1, publishedAt: -1 });

// Browse body-style chips (SUV/Hatchback/Sedan/…) + status
VehicleSchema.index({ bodyStyle: 1, status: 1 });

// Full-text search across name, parentModel, variantName
VehicleSchema.index({ name: 'text', parentModel: 'text', variantName: 'text' }, {
  weights: { parentModel: 10, name: 5, variantName: 3 },
  name: 'vehicle_text_search'
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
