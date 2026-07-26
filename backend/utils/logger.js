/**
 * Centralized Structured Logger & Audit Utility
 * Provides structured log outputs and security event tracking without logging secrets.
 */
const logger = {
  info: (msg, meta = '') => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, meta ? JSON.stringify(meta) : ''),
  warn: (msg, meta = '') => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg, meta = '') => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, meta ? JSON.stringify(meta) : ''),
  audit: (action, details = {}) => {
    // Audit Trail (never log secrets or passwords)
    const sanitized = { ...details };
    delete sanitized.password;
    delete sanitized.secret;
    delete sanitized.token;
    console.log(`[AUDIT] ${new Date().toISOString()} - ACTION: ${action}`, JSON.stringify(sanitized));
  },
  debug: (msg, meta = '') => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, meta ? JSON.stringify(meta) : '');
    }
  }
};

module.exports = logger;
