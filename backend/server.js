/**
 * EVCorn Backend Server Application Bootstrap
 * Layered Architecture + Security + Performance + Observability (Phase 7)
 */
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const path = require('path');
const config = require('./config/env');
const corsMiddleware = require('./config/cors');
const { connectDatabase, isLocalFileDb, fileDb } = require('./config/database');
const logger = require('./utils/logger');
const requestIdMiddleware = require('./middlewares/requestId.middleware');
const { requestLoggerMiddleware } = require('./middlewares/requestLogger.middleware');
const conditionalRequestMiddleware = require('./middlewares/etag.middleware');
const maintenanceMiddleware = require('./middlewares/maintenance.middleware');
const apiRouter = require('./routes/index');
const errorHandler = require('./middlewares/error.middleware');
const { sanitizeInput } = require('./middlewares/sanitize.middleware');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');
const Article = require('./models/Article');

const app = express();

// 1. Correlation, Maintenance & Observability Middleware
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
app.use(maintenanceMiddleware);
app.use(conditionalRequestMiddleware);

// 2. Cheap Security Middleware (Helmet)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// 3. Strict CORS Policy
app.use(corsMiddleware);

// 4. Response Compression (Gzip / Brotli Level 6, Threshold > 512 bytes)
app.use(compression({
  level: 6,
  threshold: 512,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// 5. Request Body Parsing & Limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 6. MongoDB Operator Injection Sanitization Guard
app.use(sanitizeInput);

// 7. Enterprise HTTP Cache-Control & CDN Edge Caching Strategy
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/auth') && !req.path.startsWith('/api/upload')) {
    res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  } else {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
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

// 8. Mount Aggregated Enterprise REST API Router (Protected with API Rate Limiter)
app.use('/api', apiLimiter, apiRouter);

// 9. Centralized Global Error Handling Middleware (Leakage Guard)
app.use(errorHandler);

// Graceful Shutdown & Uncaught Exception Handlers
let server;

function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown of HTTP server...`);
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      if (!isLocalFileDb() && mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
        logger.info('MongoDB connection closed cleanly.');
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.message}`, { stack: err.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error(`UNHANDLED PROMISE REJECTION: ${reason}`);
});

// Connect Database & Start Server
connectDatabase().then(() => {
  if (process.env.NODE_ENV !== 'test') {
    server = app.listen(config.PORT, () => {
      logger.info(`Enterprise Server running on port ${config.PORT} [Environment: ${config.NODE_ENV}]`);
    });
  }
});

module.exports = app;
