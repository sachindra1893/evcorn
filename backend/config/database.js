/**
 * Central Database Connection & File DB Fallback Config
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

// Local File DB Helper
const fileDb = {
  getArticles() {
    const filePath = path.join(DATA_DIR, 'articles.json');
    if (!fs.existsSync(filePath)) return [];
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return [];
    }
  },
  saveArticles(articles) {
    fs.writeFileSync(path.join(DATA_DIR, 'articles.json'), JSON.stringify(articles, null, 2));
  },
  getCategories() {
    const filePath = path.join(DATA_DIR, 'categories.json');
    if (!fs.existsSync(filePath)) return [];
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return [];
    }
  },
  saveCategories(categories) {
    fs.writeFileSync(path.join(DATA_DIR, 'categories.json'), JSON.stringify(categories, null, 2));
  },
  getVehicles() {
    const filePath = path.join(DATA_DIR, 'vehicles.json');
    if (!fs.existsSync(filePath)) return [];
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return [];
    }
  },
  saveVehicles(vehicles) {
    fs.writeFileSync(path.join(DATA_DIR, 'vehicles.json'), JSON.stringify(vehicles, null, 2));
  }
};

async function connectDatabase() {
  if (!config.MONGO_URI) {
    logger.warn('MONGO_URI is not defined. Falling back to local JSON file database!');
    useLocalFileDb = true;
    return;
  }

  try {
    await mongoose.connect(config.MONGO_URI);
    logger.info('Successfully connected to MongoDB Atlas.');
  } catch (err) {
    logger.error('Database connection error:', err.message);
    logger.warn('Falling back to local JSON file database mode.');
    useLocalFileDb = true;
  }
}

function isLocalFileDb() {
  return useLocalFileDb;
}

module.exports = {
  connectDatabase,
  isLocalFileDb,
  fileDb
};
