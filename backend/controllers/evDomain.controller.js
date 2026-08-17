/**
 * EV Domain Intelligence Controller
 */
const evDomainService = require('../services/evDomain.service');
const vehicleRepository = require('../repositories/vehicle.repository');
const { toVehicleListDTO } = require('../dto/vehicle.dto');
const { logEvent } = require('../utils/eventLogger');

class EVDomainController {
  async getEVScore(req, res) {
    logEvent('calculator_used');
    const scoreData = evDomainService.calculateEVScore(req.body || {});
    res.status(200).json({
      success: true,
      data: scoreData
    });
  }

  async getTCO(req, res) {
    logEvent('calculator_used');
    const tcoData = evDomainService.calculateTCO(req.body || {});
    res.status(200).json({
      success: true,
      data: tcoData
    });
  }

  async getChargingCost(req, res) {
    logEvent('calculator_used');
    const costData = evDomainService.calculateChargingCost(req.body || {});
    res.status(200).json({
      success: true,
      data: costData
    });
  }

  async getRealWorldRange(req, res) {
    logEvent('calculator_used');
    const rangeData = evDomainService.estimateRealWorldRange(req.body || {});
    res.status(200).json({
      success: true,
      data: rangeData
    });
  }

  async checkCompatibility(req, res) {
    const compatData = evDomainService.checkCompatibility(req.body || {});
    res.status(200).json({
      success: true,
      data: compatData
    });
  }

  async getSmartRecommendations(req, res, next) {
    try {
      const rawVehicles = await vehicleRepository.findAll({});
      const vehicles = toVehicleListDTO(rawVehicles);
      const recommendations = evDomainService.getSmartRecommendations({
        ...req.body,
        vehicles
      });

      res.status(200).json({
        success: true,
        count: recommendations.length,
        data: recommendations
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EVDomainController();
