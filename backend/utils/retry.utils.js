/**
 * Exponential Backoff & Resilience Retry Utility
 */
const logger = require('./logger');

async function withRetry(fn, options = {}) {
  const retries = options.retries || 3;
  const delayMs = options.delayMs || 300;
  const backoffFactor = options.backoffFactor || 2;

  let attempt = 0;
  let currentDelay = delayMs;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= retries) {
        logger.error(`Operation failed after ${retries} attempts: ${error.message}`);
        throw error;
      }
      logger.warn(`Operation attempt ${attempt} failed: ${error.message}. Retrying in ${currentDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffFactor;
    }
  }
}

module.exports = {
  withRetry
};
