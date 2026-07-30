/**
 * Enterprise Health Check & Observability Controller
 */
const mongoose = require('mongoose');
const config = require('../config/env');
const { isLocalFileDb } = require('../config/database');
const { getSystemMetrics } = require('../middlewares/requestLogger.middleware');

function cloudinaryConfigured() {
  const c = config.CLOUDINARY || {};
  return Boolean(c.CLOUD_NAME && c.API_KEY && c.API_SECRET);
}

function dependencySnapshot() {
  const dbConnected = isLocalFileDb() || mongoose.connection.readyState === 1;
  return {
    database: {
      status: dbConnected ? 'UP' : 'DOWN',
      mode: isLocalFileDb() ? 'file-db' : 'mongodb'
    },
    cloudinary: {
      // Config presence only — no live ping (avoids upload-quota / latency side effects).
      status: cloudinaryConfigured() ? 'CONFIGURED' : 'NOT_CONFIGURED'
    }
  };
}

class HealthController {
  async getHealth(req, res) {
    const dbConnected = isLocalFileDb() || mongoose.connection.readyState === 1;
    const dependencies = dependencySnapshot();
    res.status(200).json({
      status: 'UP',
      environment: process.env.NODE_ENV || 'development',
      database: isLocalFileDb()
        ? 'Local JSON File DB'
        : dbConnected
          ? 'Connected (MongoDB Atlas)'
          : 'Disconnected',
      dependencies,
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
    const dependencies = dependencySnapshot();
    if (dbConnected) {
      return res.status(200).json({
        status: 'READY',
        database: 'Connected',
        dependencies,
        timestamp: new Date().toISOString()
      });
    }
    return res.status(503).json({
      status: 'NOT_READY',
      database: 'Disconnected',
      dependencies,
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
