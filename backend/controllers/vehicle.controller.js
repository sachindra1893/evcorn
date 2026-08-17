/**
 * Vehicle Controller
 * Lightweight request receiver & response dispatcher. Zero DB queries or business logic.
 */
const vehicleService = require('../services/vehicle.service');
const { validateQuery } = require('../validators/query.validator');
const { validateVehicleInput } = require('../validators/vehicle.validator');
const { logEvent } = require('../utils/eventLogger');

class VehicleController {
  async getVehicles(req, res, next) {
    try {
      validateQuery(req.query);
      const result = await vehicleService.getVehicles(req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getVehicleById(req, res, next) {
    try {
      logEvent('vehicle_viewed');
      const result = await vehicleService.getVehicleById(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async saveVehicle(req, res, next) {
    try {
      validateVehicleInput(req.body);
      const result = await vehicleService.saveVehicle(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteVehicle(req, res, next) {
    try {
      const result = await vehicleService.deleteVehicle(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VehicleController();
