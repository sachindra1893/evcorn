/**
 * Maintenance Mode Middleware
 * Gated maintenance response triggered when MAINTENANCE_MODE=true.
 * Bypasses health probes and authenticated admin requests (JWT only).
 */
const { verifyToken } = require('../utils/auth.utils');

function maintenanceMiddleware(req, res, next) {
  const isMaintenance = process.env.MAINTENANCE_MODE === 'true';

  if (!isMaintenance) {
    return next();
  }

  // 1. Bypass Health Probes & Metrics
  if (req.path.startsWith('/api/health') || req.path === '/health') {
    return next();
  }

  // 2. Bypass Admin Authentication Endpoints
  if (req.path === '/api/auth/login') {
    return next();
  }

  // 3. Bypass Authenticated Admin Requests (JWT Bearer only)
  const authHeader = req.headers['authorization'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded && decoded.role === 'admin') {
      return next();
    }
  }

  // Block Public Traffic with HTTP 503
  res.status(503).json({
    success: false,
    requestId: req.id || req.headers['x-request-id'] || 'N/A',
    error: {
      code: 'SERVICE_MAINTENANCE',
      message: 'EVCorn platform is currently undergoing scheduled maintenance. Please try again shortly.',
      retryAfterSeconds: 300
    }
  });
}

module.exports = maintenanceMiddleware;
