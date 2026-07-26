/**
 * Enterprise Strict CORS Policy Configuration
 */
const cors = require('cors');
const config = require('./env');
const logger = require('../utils/logger');

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser calls (like Postman, cURL, server-to-server)
    if (!origin) return callback(null, true);

    // Whitelist Check
    const isWhitelisted = config.ALLOWED_ORIGINS.some(allowed => {
      if (allowed === origin) return true;
      if (origin.endsWith('.vercel.app')) return true; // Vercel Preview Deployments
      return false;
    });

    if (isWhitelisted) {
      callback(null, true);
    } else {
      logger.warn(`CORS Access Blocked for Origin: ${origin}`);
      callback(new Error(`CORS origin policy blocked request from ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password'],
  credentials: true,
  maxAge: 86400 // 24 hours preflight cache
};

module.exports = cors(corsOptions);
