/**
 * EVCorn Backend Server Application Bootstrap
 * Refactored to Enterprise Layered Architecture + Security Hardening (Phase 4)
 */
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const config = require('./config/env');
const corsMiddleware = require('./config/cors');
const { connectDatabase, isLocalFileDb, fileDb } = require('./config/database');
const logger = require('./utils/logger');
const apiRouter = require('./routes/index');
const errorHandler = require('./middlewares/error.middleware');
const { sanitizeInput } = require('./middlewares/sanitize.middleware');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');
const Article = require('./models/Article');

const app = express();

// 1. HTTP Security Headers (Helmet: XSS, Frameguard, MIME sniffing, HSTS)
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to prevent blocking Cloudinary / external assets
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// 2. Strict CORS Policy
app.use(corsMiddleware);

// 3. Request Body Parsing & Limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 4. MongoDB Operator Injection Sanitization Guard
app.use(sanitizeInput);

// 5. Cache-Control Header
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Serve development test static files (disabled in production)
if (config.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Dynamic XML Sitemap Endpoint
app.get('/api/sitemap.xml', async (req, res, next) => {
  try {
    let articles = [];
    if (isLocalFileDb()) {
      articles = fileDb.getArticles().filter(a => a.active);
    } else {
      articles = await Article.find({ active: true }).lean();
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://evcorn.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://evcorn.com/compare</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://evcorn.com/articles</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://evcorn.com/about</loc>
    <lastmod>2026-07-12</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;

    for (const art of articles) {
      const artId = art._id ? art._id.toString() : (art.id || '');
      const dateStr = art.createdAt 
        ? new Date(art.createdAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      xml += `
  <url>
    <loc>https://evcorn.com/articles/${artId}</loc>
    <lastmod>${dateStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    xml += '\n</urlset>';
    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    next(error);
  }
});

// Root API Health Check Endpoint
app.get('/', (req, res) => {
  res.send('EVCorn Enterprise Backend API is running successfully!');
});

// 6. Mount Aggregated Enterprise REST API Router (Protected with API Rate Limiter)
app.use('/api', apiLimiter, apiRouter);

// 7. Centralized Global Error Handling Middleware (Leakage Guard)
app.use(errorHandler);

// Connect Database & Start Server
connectDatabase().then(() => {
  app.listen(config.PORT, () => {
    logger.info(`Secured Server running on port ${config.PORT} [Environment: ${config.NODE_ENV}]`);
  });
});

module.exports = app;
