/**
 * Request Logger & Metrics Tracking Middleware
 */
const logger = require('../utils/logger');

// Global Metrics Collector State
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  errorRequests: 0,
  totalResponseTimeMs: 0,
  startTime: Date.now()
};

function requestLoggerMiddleware(req, res, next) {
  const start = Date.now();
  metrics.totalRequests++;

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    metrics.totalResponseTimeMs += durationMs;

    if (res.statusCode >= 400) {
      metrics.errorRequests++;
    } else {
      metrics.successfulRequests++;
    }

    // Skip logging health checks to reduce log noise
    if (req.originalUrl.includes('/health')) return;

    logger.info(`HTTP ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`, {
      reqId: req.id,
      ip: req.ip || req.headers['x-forwarded-for'],
      status: res.statusCode,
      durationMs
    });
  });

  next();
}

function getSystemMetrics() {
  const mem = process.memoryUsage();
  const uptimeSec = Math.floor(process.uptime());
  const avgResponseTimeMs = metrics.totalRequests > 0 
    ? Math.round(metrics.totalResponseTimeMs / metrics.totalRequests) 
    : 0;

  return {
    uptime: `${uptimeSec}s`,
    uptimeSeconds: uptimeSec,
    totalRequests: metrics.totalRequests,
    successfulRequests: metrics.successfulRequests,
    errorRequests: metrics.errorRequests,
    errorRate: metrics.totalRequests > 0 ? `${((metrics.errorRequests / metrics.totalRequests) * 100).toFixed(2)}%` : '0%',
    avgResponseTimeMs: `${avgResponseTimeMs}ms`,
    memory: {
      rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`
    },
    nodeVersion: process.version,
    pid: process.pid
  };
}

module.exports = {
  requestLoggerMiddleware,
  getSystemMetrics
};
