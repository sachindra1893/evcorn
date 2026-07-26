/**
 * Vehicle Routes Definition
 */
const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const { checkAdminAuth } = require('../middlewares/auth.middleware');

router.get('/', vehicleController.getVehicles);
router.get('/:id', vehicleController.getVehicleById);
router.post('/', checkAdminAuth, vehicleController.saveVehicle);
router.delete('/:id', checkAdminAuth, vehicleController.deleteVehicle);

module.exports = router;
