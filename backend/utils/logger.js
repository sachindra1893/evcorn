/**
 * Centralized Structured Logger Utility
 * Provides structured log outputs and prepares backend for production Datadog/Sentry integration.
 */
const logger = {
  info: (msg, meta = '') => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, meta ? JSON.stringify(meta) : ''),
  warn: (msg, meta = '') => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg, meta = '') => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, meta ? JSON.stringify(meta) : ''),
  debug: (msg, meta = '') => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, meta ? JSON.stringify(meta) : '');
    }
  }
};

module.exports = logger;
