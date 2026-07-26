/**
 * Vehicle Repository
 * Handles ONLY raw database queries (MongoDB Atlas or File DB). Zero business logic.
 */
const Vehicle = require('../models/Vehicle');
const { isLocalFileDb, fileDb } = require('../config/database');

class VehicleRepository {
  async findAll(filterQuery, projection, sort, skip = 0, limit = 0) {
    if (isLocalFileDb()) {
      let vehicles = fileDb.getVehicles();
      if (filterQuery.categoryId) {
        vehicles = vehicles.filter(v => v.categoryId === filterQuery.categoryId);
      }
      vehicles.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      if (limit > 0) {
        vehicles = vehicles.slice(skip, skip + limit);
      }
      return vehicles;
    }

    let query = Vehicle.find(filterQuery, projection).sort(sort).lean();
    if (skip > 0) query = query.skip(skip);
    if (limit > 0) query = query.limit(limit);
    return await query;
  }

  async count(filterQuery) {
    if (isLocalFileDb()) {
      const vehicles = fileDb.getVehicles();
      return vehicles.length;
    }
    return await Vehicle.countDocuments(filterQuery);
  }

  async findById(slugId) {
    if (isLocalFileDb()) {
      const vehicles = fileDb.getVehicles();
      return vehicles.find(v => v.id === slugId) || null;
    }
    return await Vehicle.findOne({ id: slugId }).lean();
  }

  async upsert(vehicleData) {
    if (isLocalFileDb()) {
      let vehicles = fileDb.getVehicles();
      const index = vehicles.findIndex(v => v.id === vehicleData.id);
      if (index !== -1) {
        vehicles[index] = { ...vehicles[index], ...vehicleData };
      } else {
        vehicles.push(vehicleData);
      }
      fileDb.saveVehicles(vehicles);
      return vehicleData;
    }

    return await Vehicle.findOneAndUpdate(
      { id: vehicleData.id },
      vehicleData,
      { new: true, upsert: true }
    ).lean();
  }

  async delete(slugId) {
    if (isLocalFileDb()) {
      let vehicles = fileDb.getVehicles();
      const index = vehicles.findIndex(v => v.id === slugId);
      if (index === -1) return null;
      const deleted = vehicles[index];
      vehicles.splice(index, 1);
      fileDb.saveVehicles(vehicles);
      return deleted;
    }

    return await Vehicle.findOneAndDelete({ id: slugId }).lean();
  }
}

module.exports = new VehicleRepository();
