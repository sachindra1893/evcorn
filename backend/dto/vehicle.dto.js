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

  // Helper: return value if it exists and is not 'N/A'
  const validVal = (val, fallback) => (val && val !== 'N/A' ? val : fallback);

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

    // Priority: Sub-document value first -> top-level string (if not 'N/A') -> fallback
    price: validVal(obj.pricing?.priceText, obj.price || 'N/A'),
    seating: validVal(obj.dimensionsObj?.seatingText, obj.seating || '5 Seater'),
    dimensions: validVal(obj.dimensionsObj?.dimensionsText, obj.dimensions || 'N/A'),
    groundClearance: validVal(obj.dimensionsObj?.groundClearanceText, obj.groundClearance || 'N/A'),
    batteryCapacity: validVal(obj.battery?.capacityText, obj.batteryCapacity || 'N/A'),
    range: validVal(obj.performance?.rangeText, obj.range || 'N/A'),
    tyreSize: validVal(obj.dimensionsObj?.tyreSize, obj.tyreSize || 'N/A'),
    bootFrunkSpace: validVal(obj.dimensionsObj?.bootFrunkText, obj.bootFrunkSpace || 'N/A'),
    bhpTorque: validVal(obj.performance?.bhpTorque, obj.bhpTorque || 'N/A'),
    drivetrain: validVal(obj.performance?.drivetrain, obj.drivetrain || 'FWD'),
    safetyRating: validVal(obj.safety?.safetyRatingText, obj.safetyRating || 'N/A'),
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
    bodyStyle: obj.bodyStyle || null,
    publishedAt: obj.publishedAt || obj.createdAt,
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
