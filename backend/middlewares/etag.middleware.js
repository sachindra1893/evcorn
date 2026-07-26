/**
 * Conditional Request & 304 Not Modified Handler
 */
function conditionalRequestMiddleware(req, res, next) {
  const clientEtag = req.headers['if-none-match'];

  // Intercept json responses to compare ETags
  const originalJson = res.json;
  res.json = function (data) {
    if (req.method === 'GET' && clientEtag) {
      const serverEtag = res.getHeader('ETag');
      if (serverEtag && (serverEtag === clientEtag || serverEtag === `W/${clientEtag}`)) {
        res.status(304).end();
        return res;
      }
    }
    return originalJson.call(this, data);
  };

  next();
}

module.exports = conditionalRequestMiddleware;
