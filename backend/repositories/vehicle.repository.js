/**
 * Vehicle Repository (Instrumented with Slow Query Monitoring)
 * Phase 5.3: File-DB path uses shared query matcher (filters/projection/pagination).
 */
const Vehicle = require('../models/Vehicle');
const { isLocalFileDb, fileDb } = require('../config/database');
const { measureQuery } = require('../utils/slowQuery.utils');
const { queryDocuments, countDocuments } = require('../utils/fileDbQuery');

class VehicleRepository {
  async findAll(filterQuery, projection, sort, skip = 0, limit = 0) {
    if (isLocalFileDb()) {
      return queryDocuments(
        fileDb.getVehicles(),
        filterQuery || {},
        projection,
        sort || { name: 1 },
        skip,
        limit
      );
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
      return countDocuments(fileDb.getVehicles(), filterQuery || {});
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
      let vehicles = fileDb.getVehicles().slice();
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
        { new: true, upsert: true, runValidators: true }
      ).lean();
    }, { slugId: vehicleData.id });
  }

  async delete(slugId) {
    if (isLocalFileDb()) {
      let vehicles = fileDb.getVehicles().slice();
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

  async updateMany(filterQuery, updateData) {
    if (isLocalFileDb()) {
      let vehicles = fileDb.getVehicles().slice();
      let updatedCount = 0;
      // Basic implementation for fileDb that matches typical filter queries
      // Only implements exact matches for simplicity (which is all we need here)
      for (let i = 0; i < vehicles.length; i++) {
        let match = true;
        for (const key in filterQuery) {
          if (vehicles[i][key] !== filterQuery[key]) {
            match = false;
            break;
          }
        }
        if (match) {
          vehicles[i] = { ...vehicles[i] };
          for (const key in updateData.$set || {}) {
            vehicles[i][key] = updateData.$set[key];
          }
          updatedCount++;
        }
      }
      if (updatedCount > 0) fileDb.saveVehicles(vehicles);
      return { modifiedCount: updatedCount };
    }

    return await measureQuery('Vehicle.updateMany', async () => {
      return await Vehicle.updateMany(filterQuery, updateData);
    }, { filterQuery });
  }
}

module.exports = new VehicleRepository();
