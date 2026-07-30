/**
 * Request Logger & Metrics Tracking Middleware (Phase 2 observability).
 * Access logs include requestId + durationMs; slow requests emit a warn.
 */
const logger = require('../utils/logger');

const SLOW_REQUEST_THRESHOLD_MS = Number(process.env.SLOW_REQUEST_MS) || 2000;
/** Treat first requests within this window after process start as cold-start. */
const COLD_START_WINDOW_MS = Number(process.env.COLD_START_WINDOW_MS) || 15000;
const PROCESS_STARTED_AT = Date.now();
let coldStartLogged = false;

// Global Metrics Collector State
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  errorRequests: 0,
  totalResponseTimeMs: 0,
  slowRequests: 0,
  startTime: Date.now()
};

function requestLoggerMiddleware(req, res, next) {
  const start = Date.now();
  metrics.totalRequests++;

  const sinceBootMs = start - PROCESS_STARTED_AT;
  const isColdStartWindow = sinceBootMs < COLD_START_WINDOW_MS;

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    metrics.totalResponseTimeMs += durationMs;

    if (res.statusCode >= 400) {
      metrics.errorRequests++;
    } else {
      metrics.successfulRequests++;
    }

    // Skip logging health checks to reduce log noise
    if (req.originalUrl.includes('/health') || req.originalUrl.includes('/live') || req.originalUrl.includes('/ready')) {
      return;
    }

    const requestId = req.id || req.headers['x-request-id'];
    const baseMeta = {
      requestId,
      reqId: requestId,
      ip: req.ip || req.headers['x-forwarded-for'],
      status: res.statusCode,
      durationMs,
      method: req.method,
      endpoint: req.originalUrl
    };

    // One-shot cold-start signal after process wake (e.g. Render free tier).
    if (isColdStartWindow && !coldStartLogged && !req.originalUrl.includes('/health')) {
      coldStartLogged = true;
      logger.warn(`Cold-start window request detected (${sinceBootMs}ms since boot)`, {
        ...baseMeta,
        eventType: 'cold_start',
        kind: 'cold_start',
        sinceBootMs,
        what: 'First application request shortly after process start',
        where: req.originalUrl,
        why: `sinceBootMs=${sinceBootMs} < ${COLD_START_WINDOW_MS}`
      });
    }

    if (durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
      metrics.slowRequests++;
      logger.warn(`SLOW REQUEST ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`, {
        ...baseMeta,
        eventType: 'http_slow',
        kind: 'slow_request',
        thresholdMs: SLOW_REQUEST_THRESHOLD_MS,
        what: 'API response exceeded slow threshold',
        where: req.originalUrl,
        why: `durationMs=${durationMs} >= ${SLOW_REQUEST_THRESHOLD_MS}`
      });
    } else {
      logger.info(`HTTP ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`, baseMeta);
    }
  });

  next();
}

function getSystemMetrics(options = {}) {
  const publicView = options.public !== false;
  const mem = process.memoryUsage();
  const uptimeSec = Math.floor(process.uptime());
  const avgResponseTimeMs = metrics.totalRequests > 0
    ? Math.round(metrics.totalResponseTimeMs / metrics.totalRequests)
    : 0;

  let cacheStats = {};
  try {
    cacheStats = require('../utils/cache').stats();
  } catch {
    cacheStats = {};
  }

  const base = {
    uptime: `${uptimeSec}s`,
    uptimeSeconds: uptimeSec,
    totalRequests: metrics.totalRequests,
    successfulRequests: metrics.successfulRequests,
    errorRequests: metrics.errorRequests,
    slowRequests: metrics.slowRequests,
    errorRate: metrics.totalRequests > 0 ? `${((metrics.errorRequests / metrics.totalRequests) * 100).toFixed(2)}%` : '0%',
    avgResponseTimeMs: `${avgResponseTimeMs}ms`,
    slowRequestThresholdMs: SLOW_REQUEST_THRESHOLD_MS,
    memory: {
      rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`
    },
    cache: {
      keys: cacheStats.keys,
      hits: cacheStats.hits,
      misses: cacheStats.misses
    }
  };

  // Phase 7: never expose process identity (pid / Node version) on public probes.
  if (!publicView) {
    base.nodeVersion = process.version;
    base.pid = process.pid;
    base.cache = cacheStats;
  }

  return base;
}

module.exports = {
  requestLoggerMiddleware,
  getSystemMetrics,
  SLOW_REQUEST_THRESHOLD_MS
};
