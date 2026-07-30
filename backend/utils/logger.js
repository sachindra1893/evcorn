/**
 * Centralized Structured Logger & Audit Utility (Phase 2).
 * - Production: single-line JSON (level, time, msg, requestId, …)
 * - Development: human-readable prefix + JSON meta for quick scanning
 * - Levels: info, warn, error, debug (debug suppressed in production)
 * - Aligns with frontend field names: requestId (accepts legacy reqId)
 * - Redacts obvious secrets; never relies on dumping stacks to clients
 */
const IS_PROD = process.env.NODE_ENV === 'production';

const SENSITIVE_KEYS = /^(password|passwd|secret|token|authorization|cookie|api[_-]?key|api[_-]?secret|jwt|mongo(_?uri)?|database_url|cloudinary|private[_-]?key)$/i;

function normalizeMeta(meta = {}) {
  const out = { ...meta };
  // Unify correlation field: prefer requestId, accept reqId from call sites.
  if (out.reqId != null && out.requestId == null) {
    out.requestId = out.reqId;
  }
  // Keep reqId as alias for existing call sites / greps during transition.
  if (out.requestId != null && out.reqId == null) {
    out.reqId = out.requestId;
  }

  for (const key of Object.keys(out)) {
    if (SENSITIVE_KEYS.test(key)) {
      out[key] = '[REDACTED]';
    }
  }

  // Avoid leaking full stacks in production structured logs unless explicitly kept.
  if (IS_PROD && out.stack && process.env.LOG_STACKS !== 'true') {
    delete out.stack;
  }

  return out;
}

function emit(level, msg, meta = {}) {
  const normalized = normalizeMeta(meta);
  const entry = {
    level,
    time: new Date().toISOString(),
    msg,
    service: 'evcorn-backend',
    ...normalized
  };

  const line = IS_PROD
    ? JSON.stringify(entry)
    : `[${level.toUpperCase()}] ${entry.time}${entry.requestId ? ` [requestId:${entry.requestId}]` : ''} - ${msg}${
        Object.keys(normalized).length > 0 ? ` ${JSON.stringify(normalized)}` : ''
      }`;

  switch (level) {
    case 'warn':
      console.warn(IS_PROD ? line : line);
      break;
    case 'error':
      console.error(IS_PROD ? line : line);
      break;
    default:
      console.log(IS_PROD ? line : line);
  }
}

const logger = {
  info: (msg, meta = {}) => emit('info', msg, meta),
  warn: (msg, meta = {}) => emit('warn', msg, meta),
  error: (msg, meta = {}) => emit('error', msg, meta),
  audit: (action, details = {}) => {
    const sanitized = normalizeMeta({ ...details });
    delete sanitized.password;
    delete sanitized.secret;
    delete sanitized.token;
    emit('info', `ACTION: ${action}`, { ...sanitized, eventType: 'audit' });
  },
  debug: (msg, meta = {}) => {
    if (!IS_PROD) {
      emit('debug', msg, meta);
    }
  }
};

module.exports = logger;
