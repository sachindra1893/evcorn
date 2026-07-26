/**
 * Centralized Structured Logger & Audit Utility
 * Supports Request ID correlation, log levels (info, warn, error, debug, audit), and secret redaction.
 */
const logger = {
  info: (msg, meta = {}) => {
    const reqId = meta?.reqId ? ` [reqId:${meta.reqId}]` : '';
    console.log(`[INFO] ${new Date().toISOString()}${reqId} - ${msg}`, Object.keys(meta).length > 0 ? JSON.stringify(meta) : '');
  },
  warn: (msg, meta = {}) => {
    const reqId = meta?.reqId ? ` [reqId:${meta.reqId}]` : '';
    console.warn(`[WARN] ${new Date().toISOString()}${reqId} - ${msg}`, Object.keys(meta).length > 0 ? JSON.stringify(meta) : '');
  },
  error: (msg, meta = {}) => {
    const reqId = meta?.reqId ? ` [reqId:${meta.reqId}]` : '';
    console.error(`[ERROR] ${new Date().toISOString()}${reqId} - ${msg}`, Object.keys(meta).length > 0 ? JSON.stringify(meta) : '');
  },
  audit: (action, details = {}) => {
    // Redact sensitive secrets from audit trail
    const sanitized = { ...details };
    delete sanitized.password;
    delete sanitized.secret;
    delete sanitized.token;
    console.log(`[AUDIT] ${new Date().toISOString()} - ACTION: ${action}`, JSON.stringify(sanitized));
  },
  debug: (msg, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      const reqId = meta?.reqId ? ` [reqId:${meta.reqId}]` : '';
      console.log(`[DEBUG] ${new Date().toISOString()}${reqId} - ${msg}`, Object.keys(meta).length > 0 ? JSON.stringify(meta) : '');
    }
  }
};

module.exports = logger;
