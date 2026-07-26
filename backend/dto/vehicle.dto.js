/**
 * Vehicle Data Transfer Object (DTO)
 * Shapes API response, strips internal keys, and ensures 100% backward compatibility.
 */
function toVehicleDTO(doc) {
  if (!doc) return null;

  // Handle Mongoose Lean or Document
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };

  // Strip Mongoose internal keys
  delete obj._id;
  delete obj.__v;

  // Guarantee top-level fallback strings exist for legacy frontend components
  return {
    id: obj.id,
    name: obj.name,
    categoryId: obj.categoryId,
    brandSlug: obj.brandSlug || obj.categoryId,
    modelId: obj.modelId || obj.parentModel,
    modelSlug: obj.modelSlug || obj.parentModel,
    variantId: obj.variantId || obj.id,
    variantSlug: obj.variantSlug || obj.id,
    parentModel: obj.parentModel || '',
    variantName: obj.variantName || '',
    price: obj.price || obj.pricing?.priceText || 'N/A',
    seating: obj.seating || obj.dimensionsObj?.seatingText || '5 Seater',
    dimensions: obj.dimensions || obj.dimensionsObj?.dimensionsText || 'N/A',
    groundClearance: obj.groundClearance || obj.dimensionsObj?.groundClearanceText || 'N/A',
    batteryCapacity: obj.batteryCapacity || obj.battery?.capacityText || 'N/A',
    range: obj.range || obj.performance?.rangeText || 'N/A',
    tyreSize: obj.tyreSize || obj.dimensionsObj?.tyreSize || 'N/A',
    bootFrunkSpace: obj.bootFrunkSpace || obj.dimensionsObj?.bootFrunkText || 'N/A',
    bhpTorque: obj.bhpTorque || 'N/A',
    drivetrain: obj.drivetrain || obj.performance?.drivetrain || 'FWD',
    safetyRating: obj.safetyRating || obj.safety?.safetyRatingText || 'N/A',
    imageUrl: obj.imageUrl || obj.media?.mainImage || '',
    galleryImages: obj.galleryImages || obj.media?.gallery || [],
    keyHighlights: obj.keyHighlights || '',

    // Cloudinary Metadata
    cloudinaryMainImage: obj.cloudinaryMainImage || obj.media?.cloudinaryMainImage || { url: '', public_id: '' },
    cloudinaryImages: obj.cloudinaryImages || obj.media?.cloudinaryImages || [],

    // Enterprise Domain Sub-Documents
    pricing: obj.pricing || { exShowroomPriceINR: 0, priceText: obj.price || 'N/A' },
    battery: obj.battery || { capacityKWh: 0, capacityText: obj.batteryCapacity || 'N/A' },
    charging: obj.charging || { acChargingKW: 0, dcFastChargingKW: 0 },
    performance: obj.performance || { claimedRangeKM: 0, rangeText: obj.range || 'N/A' },
    dimensionsObj: obj.dimensionsObj || {},
    media: obj.media || {},
    safety: obj.safety || {},
    seo: obj.seo || {},

    status: obj.status || 'Published',
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt
  };
}

function toVehicleListDTO(docs) {
  if (!Array.isArray(docs)) return [];
  return docs.map(toVehicleDTO);
}

module.exports = {
  toVehicleDTO,
  toVehicleListDTO
};
