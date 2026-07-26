/**
 * Vehicle Repository (Instrumented with Slow Query Monitoring)
 */
const Vehicle = require('../models/Vehicle');
const { isLocalFileDb, fileDb } = require('../config/database');
const { measureQuery } = require('../utils/slowQuery.utils');

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

    return await measureQuery('Vehicle.findAll', async () => {
      let query = Vehicle.find(filterQuery, projection).sort(sort).lean();
      if (skip > 0) query = query.skip(skip);
      if (limit > 0) query = query.limit(limit);
      return await query;
    }, { filterQuery });
  }

  async count(filterQuery) {
    if (isLocalFileDb()) {
      const vehicles = fileDb.getVehicles();
      return vehicles.length;
    }

    return await measureQuery('Vehicle.count', async () => {
      return await Vehicle.countDocuments(filterQuery);
    }, { filterQuery });
  }

  async findById(slugId) {
    if (isLocalFileDb()) {
      const vehicles = fileDb.getVehicles();
      return vehicles.find(v => v.id === slugId) || null;
    }

    return await measureQuery('Vehicle.findById', async () => {
      return await Vehicle.findOne({ id: slugId }).lean();
    }, { slugId });
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

    return await measureQuery('Vehicle.upsert', async () => {
      return await Vehicle.findOneAndUpdate(
        { id: vehicleData.id },
        vehicleData,
        { new: true, upsert: true }
      ).lean();
    }, { slugId: vehicleData.id });
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

    return await measureQuery('Vehicle.delete', async () => {
      return await Vehicle.findOneAndDelete({ id: slugId }).lean();
    }, { slugId });
  }
}

module.exports = new VehicleRepository();
