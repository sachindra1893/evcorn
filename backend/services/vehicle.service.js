/**
 * Vehicle Service
 * Business logic, domain data transformation & repository orchestration for Vehicles.
 */
const vehicleRepository = require('../repositories/vehicle.repository');
const { deleteImage } = require('./upload.service');
const { parseQueryParams, buildVehicleFilterQuery, formatResponse } = require('../utils/apiQuery');
const { toVehicleDTO, toVehicleListDTO } = require('../dto/vehicle.dto');
const { NotFoundError } = require('../errors/AppError');

class VehicleService {
  async getVehicles(queryParams) {
    const isLight = queryParams.light === 'true';
    const { page, limit, sort, projection: customProjection, formatEnvelope } = parseQueryParams(queryParams);
    const filterQuery = buildVehicleFilterQuery(queryParams);

    const projection = customProjection || (isLight ? 'id name categoryId parentModel' : null);
    const skip = page && limit ? (page - 1) * limit : 0;

    const [docs, total] = await Promise.all([
      vehicleRepository.findAll(filterQuery, projection, sort || { name: 1 }, skip, limit || 0),
      vehicleRepository.count(filterQuery)
    ]);

    const dtos = toVehicleListDTO(docs);
    const meta = page && limit ? { page, limit, total, pages: Math.ceil(total / limit) } : null;

    return formatResponse(dtos, meta, formatEnvelope);
  }

  async getVehicleById(slugId) {
    const doc = await vehicleRepository.findById(slugId);
    if (!doc) {
      throw new NotFoundError(`Vehicle with id "${slugId}" not found`);
    }
    return toVehicleDTO(doc);
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

    const doc = await vehicleRepository.upsert(vehicleData);
    return toVehicleDTO(doc);
  }

  async deleteVehicle(slugId) {
    const deleted = await vehicleRepository.delete(slugId);
    if (!deleted) {
      throw new NotFoundError(`Vehicle with id "${slugId}" not found`);
    }

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
