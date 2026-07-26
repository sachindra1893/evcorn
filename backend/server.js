/**
 * EVCorn Backend Server Application Bootstrap
 * Refactored to Enterprise Layered Architecture (Routes -> Controllers -> Services -> Repositories -> DB)
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/env');
const { connectDatabase, isLocalFileDb, fileDb } = require('./config/database');
const logger = require('./utils/logger');
const apiRouter = require('./routes/index');
const errorHandler = require('./middlewares/error.middleware');
const Article = require('./models/Article');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Cache-Control to prevent browser/CDN caching of dynamic API routes
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

// Mount Aggregated Enterprise REST API Router
app.use('/api', apiRouter);

// Centralized Global Error Handling Middleware
app.use(errorHandler);

// Connect Database & Start Server
connectDatabase().then(() => {
  app.listen(config.PORT, () => {
    logger.info(`Server is running on port ${config.PORT} [Environment: ${config.NODE_ENV}]`);
  });
});

module.exports = app;
