/**
 * MongoDB Operator Injection Sanitization Middleware
 * Deeply sanitizes keys starting with '$' or containing '.' in query and body.
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const clean = {};
  for (const key of Object.keys(obj)) {
    // Strip keys starting with $ (MongoDB operator injection vectors)
    if (key.startsWith('$')) {
      continue;
    }
    clean[key] = sanitizeObject(obj[key]);
  }
  return clean;
}

function sanitizeInput(req, res, next) {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
}

module.exports = {
  sanitizeInput,
  sanitizeObject
};
