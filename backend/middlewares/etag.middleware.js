/**
 * Conditional Request & 304 Not Modified Handler
 *
 * Computes a weak ETag from the JSON body before send. When the client sends
 * a matching If-None-Match, respond with 304 without re-sending the payload.
 * Express default ETag alone often never fired for our wrapped res.json path.
 */
const crypto = require('crypto');

function weakEtagFromBody(data) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  const hash = crypto.createHash('sha1').update(body).digest('hex');
  return { etag: `W/"${hash}"`, body };
}

function etagsMatch(clientEtag, serverEtag) {
  if (!clientEtag || !serverEtag) return false;
  // Clients may send comma-separated lists (RFC 9110)
  const candidates = String(clientEtag).split(',').map((s) => s.trim());
  return candidates.some((c) => {
    if (c === '*') return true;
    if (c === serverEtag) return true;
    // Compare ignoring weak/strong marker differences
    const strip = (v) => v.replace(/^W\//i, '');
    return strip(c) === strip(serverEtag);
  });
}

function conditionalRequestMiddleware(req, res, next) {
  const originalJson = res.json;
  res.json = function (data) {
    if (req.method !== 'GET') {
      return originalJson.call(this, data);
    }

    // Mutations / private responses should not participate in public 304 reuse
    const cacheControl = String(res.getHeader('Cache-Control') || '');
    if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
      return originalJson.call(this, data);
    }

    const { etag } = weakEtagFromBody(data);
    res.setHeader('ETag', etag);

    const clientEtag = req.headers['if-none-match'];
    if (etagsMatch(clientEtag, etag)) {
      res.status(304).end();
      return res;
    }

    return originalJson.call(this, data);
  };

  next();
}

module.exports = conditionalRequestMiddleware;
