/**
 * Slow Query Monitoring & Execution Wrapper
 * Logs warnings for any database query taking > 100ms.
 */
const logger = require('./logger');

const SLOW_QUERY_THRESHOLD_MS = 100;

async function measureQuery(operationName, queryFn, meta = {}) {
  const start = Date.now();
  try {
    const result = await queryFn();
    const durationMs = Date.now() - start;

    if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`SLOW QUERY DETECTED [${durationMs}ms > ${SLOW_QUERY_THRESHOLD_MS}ms] in ${operationName}`, {
        operationName,
        durationMs,
        ...meta
      });
    } else {
      logger.debug(`Query [${operationName}] executed in ${durationMs}ms`);
    }

    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    logger.error(`Query Failed [${operationName}] after ${durationMs}ms: ${err.message}`, {
      operationName,
      durationMs,
      ...meta
    });
    throw err;
  }
}

module.exports = {
  measureQuery,
  SLOW_QUERY_THRESHOLD_MS
};
