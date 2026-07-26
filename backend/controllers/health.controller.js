/**
 * Enterprise Health Check & Observability Controller
 */
const mongoose = require('mongoose');
const { isLocalFileDb } = require('../config/database');
const { getSystemMetrics } = require('../middlewares/requestLogger.middleware');

class HealthController {
  async getHealth(req, res) {
    const dbConnected = isLocalFileDb() || mongoose.connection.readyState === 1;
    res.status(200).json({
      status: 'UP',
      environment: process.env.NODE_ENV || 'development',
      database: isLocalFileDb() ? 'Local JSON File DB' : (dbConnected ? 'Connected (MongoDB Atlas)' : 'Disconnected'),
      timestamp: new Date().toISOString(),
      metrics: getSystemMetrics()
    });
  }

  async getLiveness(req, res) {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString()
    });
  }

  async getReadiness(req, res) {
    const dbConnected = isLocalFileDb() || mongoose.connection.readyState === 1;
    if (dbConnected) {
      return res.status(200).json({
        status: 'READY',
        database: 'Connected',
        timestamp: new Date().toISOString()
      });
    }
    return res.status(503).json({
      status: 'NOT_READY',
      database: 'Disconnected',
      timestamp: new Date().toISOString()
    });
  }

  async getMetrics(req, res) {
    res.status(200).json({
      success: true,
      data: getSystemMetrics()
    });
  }
}

module.exports = new HealthController();
