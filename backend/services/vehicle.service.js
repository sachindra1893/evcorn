/**
 * Vehicle Service
 * Business logic, domain data transformation & repository orchestration for Vehicles.
 * Pillar I: In-process node-cache for read-heavy endpoints.
 * Pillar IV: Extended light=true projection to include imageUrl, bodyStyle, etc.
 * Phase 4: cache filtered/paginated GET lists via stable query fingerprints.
 */
const vehicleRepository = require('../repositories/vehicle.repository');
const { deleteImage } = require('./upload.service');
const { parseQueryParams, buildVehicleFilterQuery, formatResponse } = require('../utils/apiQuery');
const { toVehicleDTO, toVehicleListDTO, toVehicleLightListDTO } = require('../dto/vehicle.dto');
const { NotFoundError } = require('../errors/AppError');
const appCache = require('../utils/cache');

// ─── Light Projection Fields ──────────────────────────────────────────────────
// CRITICAL FIX (Pillar IV): Original 'id name categoryId parentModel' was missing
// imageUrl, batteryCapacity, bodyStyle, variantName — breaking browse-evs photo rendering.
const LIGHT_PROJECTION = [
  'id', 'name', 'categoryId', 'parentModel', 'variantName',
  'imageUrl', 'batteryCapacity', 'bodyStyle', 'status',
  'pricing.exShowroomPriceINR', 'pricing.priceText',
  'performance.claimedRangeKM', 'performance.rangeText',
  'battery.capacityKWh',
  'dimensionsObj.seatingCapacity',
  'media.mainImage', 'media.cloudinaryMainImage'
].join(' ');

function invalidateVehicleCaches(slugId) {
  appCache.flushPrefix('vehicles:');
  appCache.flushPrefix('search:');
  appCache.flushPrefix('recommendations:');
  if (slugId) appCache.del(appCache.KEYS.VEHICLE_SINGLE(slugId));
}

class VehicleService {
  async getVehicles(queryParams) {
    const isLight = queryParams.light === 'true';
    const { page, limit, sort, projection: customProjection, formatEnvelope } = parseQueryParams(queryParams);
    const filterQuery = buildVehicleFilterQuery(queryParams);

    // Cache all safe GET list shapes (including filtered/paginated). Admin-only
    // or arbitrary fields= projections are excluded to avoid cache key explosion
    // and stale privileged views.
    const isCacheable = !queryParams.admin && !customProjection;
    const fp = appCache.fingerprintQuery(queryParams, ['admin']);
    const envelopeSuffix = formatEnvelope ? ':envelope' : '';
    const cacheKey = isLight
      ? appCache.KEYS.VEHICLES_LIGHT(fp) + envelopeSuffix
      : appCache.KEYS.VEHICLES_ALL(fp) + envelopeSuffix;

    if (isCacheable) {
      const cached = appCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    // ── MongoDB Query ─────────────────────────────────────────────────────────
    const projection = customProjection || (isLight ? LIGHT_PROJECTION : null);
    const skip = page && limit ? (page - 1) * limit : 0;
    const needsCount = Boolean(page && limit);

    const [docs, total] = await Promise.all([
      vehicleRepository.findAll(filterQuery, projection, sort || { name: 1 }, skip, limit || 0),
      needsCount ? vehicleRepository.count(filterQuery) : Promise.resolve(0)
    ]);

    const dtos = isLight ? toVehicleLightListDTO(docs) : toVehicleListDTO(docs);
    const meta = needsCount ? { page, limit, total, pages: Math.ceil(total / limit) } : null;

    const result = formatResponse(dtos, meta, formatEnvelope);

    // ── Cache store ───────────────────────────────────────────────────────────
    if (isCacheable) {
      const ttl = isLight ? appCache.TTL.VEHICLES_LIGHT : appCache.TTL.VEHICLES_ALL;
      appCache.set(cacheKey, result, ttl);
    }

    return result;
  }

  async getVehicleById(slugId) {
    const cacheKey = appCache.KEYS.VEHICLE_SINGLE(slugId);
    const cached = appCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const doc = await vehicleRepository.findById(slugId);
    if (!doc) {
      throw new NotFoundError(`Vehicle with id "${slugId}" not found`);
    }

    const result = toVehicleDTO(doc);
    appCache.set(cacheKey, result, appCache.TTL.VEHICLE_SINGLE);
    return result;
  }

  async saveVehicle(vehicleData) {
    if (!vehicleData.id) {
      vehicleData.id = vehicleData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    // Helper numeric extractor
    const num = str => (str && typeof str === 'string' ? parseFloat((str.match(/\d+(\.\d+)?/) || [0])[0]) : 0);
    const priceNum = num(vehicleData.price);
    const priceINR = vehicleData.price?.toLowerCase().includes('lakh') ? Math.round(priceNum * 100000) : Math.round(priceNum);

    vehicleData.pricing = vehicleData.pricing || {
      exShowroomPriceINR: priceINR,
      priceText: vehicleData.price || 'N/A'
    };
    vehicleData.battery = vehicleData.battery || {
      capacityKWh: num(vehicleData.batteryCapacity),
      capacityText: vehicleData.batteryCapacity || 'N/A'
    };
    vehicleData.performance = vehicleData.performance || {
      claimedRangeKM: num(vehicleData.range),
      rangeText: vehicleData.range || 'N/A'
    };
    vehicleData.dimensionsObj = vehicleData.dimensionsObj || {
      kerbWeightKG: num(vehicleData.kerbWeight),
      grossWeightKG: num(vehicleData.grossWeight)
    };

    const doc = await vehicleRepository.upsert(vehicleData);

    // Synchronize launch date to non-overridden siblings
    if (vehicleData.parentModel && !vehicleData.isLaunchDateOverride) {
      await vehicleRepository.updateMany(
        { parentModel: vehicleData.parentModel, isLaunchDateOverride: false },
        { $set: { launchDate: vehicleData.launchDate || '' } }
      );
    }

    // ── Invalidate all vehicle cache keys on write ────────────────────────────
    invalidateVehicleCaches(vehicleData.id);

    return toVehicleDTO(doc);
  }

  async deleteVehicle(slugId) {
    const deleted = await vehicleRepository.delete(slugId);
    if (!deleted) {
      throw new NotFoundError(`Vehicle with id "${slugId}" not found`);
    }

    invalidateVehicleCaches(slugId);

    // Synchronized Cloudinary Deletion (safe background orchestration)
    try {
      if (deleted.imageUrl && deleted.imageUrl.includes('cloudinary')) {
        await deleteImage(deleted.imageUrl);
      }
      if (deleted.cloudinaryImages && Array.isArray(deleted.cloudinaryImages)) {
        for (const item of deleted.cloudinaryImages) {
          const target = item.public_id || item.url;
          if (target && target.includes('cloudinary')) {
            await deleteImage(target);
          }
        }
      }
    } catch (cleanErr) {
      // Non-fatal cleanup warning
    }

    return { message: 'Vehicle deleted successfully' };
  }
}

module.exports = new VehicleService();
