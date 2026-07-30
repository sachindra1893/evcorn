/**
 * Central Database Connection & File DB Fallback Config
 * Phase 5.3: in-memory parse cache — File-DB previously re-read + JSON.parse
 * on every getVehicles/getArticles/getCategories call (proven hot-path cost at scale).
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('./env');
const logger = require('../utils/logger');

let useLocalFileDb = false;

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** In-memory File-DB cache (invalidated on write). */
const mem = {
  vehicles: null,
  articles: null,
  categories: null
};

function readJsonArray(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(fileName, data) {
  fs.writeFileSync(path.join(DATA_DIR, fileName), JSON.stringify(data, null, 2));
}

// Local File DB Helper
const fileDb = {
  getArticles() {
    if (mem.articles) return mem.articles;
    mem.articles = readJsonArray('articles.json');
    return mem.articles;
  },
  saveArticles(articles) {
    mem.articles = articles;
    writeJsonArray('articles.json', articles);
  },
  getCategories() {
    if (mem.categories) return mem.categories;
    mem.categories = readJsonArray('categories.json');
    return mem.categories;
  },
  saveCategories(categories) {
    mem.categories = categories;
    writeJsonArray('categories.json', categories);
  },
  getVehicles() {
    if (mem.vehicles) return mem.vehicles;
    mem.vehicles = readJsonArray('vehicles.json');
    return mem.vehicles;
  },
  saveVehicles(vehicles) {
    mem.vehicles = vehicles;
    writeJsonArray('vehicles.json', vehicles);
  },
  /** Test / scale-harness helper — drop memory cache without touching disk. */
  invalidateCache(which = ['vehicles', 'articles', 'categories']) {
    for (const key of which) {
      mem[key] = null;
    }
  }
};

async function connectDatabase() {
  if (config.NODE_ENV === 'test' || !config.MONGO_URI) {
    useLocalFileDb = true;
    return;
  }

  try {
    await mongoose.connect(config.MONGO_URI, {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    logger.info('Successfully connected to MongoDB Atlas with connection pool (min: 10, max: 50).');

    // Attach connection resilience handlers
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected! Attempting reconnect...');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB runtime connection error:', { error: err.message });
    });
  } catch (err) {
    logger.error('Database connection error:', err.message);
    logger.warn('Falling back to local JSON file database mode.');
    useLocalFileDb = true;
  }
}

function isLocalFileDb() {
  return useLocalFileDb || mongoose.connection.readyState !== 1;
}

module.exports = {
  connectDatabase,
  isLocalFileDb,
  fileDb
};
