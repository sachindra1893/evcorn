/**
 * EVCorn In-Process Cache Utility
 * Wraps node-cache with namespaced key helpers, TTL presets, and safe get/set/del/flush.
 *
 * TTL Strategy:
 *   - categories : 3600s (1hr)  — changes almost never
 *   - vehicles   : 300s  (5min) — changes when admin saves a vehicle
 *   - articles   : 180s  (3min) — changes when editorial publishes
 *   - search     : 60s   (1min) — dynamic but safe to cache briefly
 */
const NodeCache = require('node-cache');

// useClones: false → avoids deep-cloning large payloads on get (faster, read-only safe)
const cache = new NodeCache({ useClones: false, checkperiod: 120 });

// ─── TTL presets (seconds) ────────────────────────────────────────────────────
const TTL = {
  CATEGORIES: 3600,
  VEHICLES_ALL: 300,
  VEHICLES_LIGHT: 300,
  VEHICLE_SINGLE: 600,
  ARTICLES_ALL: 180,
  ARTICLES_LIGHT: 180,
  ARTICLE_SINGLE: 600,
  SEARCH: 60,
};

// ─── Cache Key Namespaces ─────────────────────────────────────────────────────
const KEYS = {
  CATEGORIES: () => 'categories:all',
  VEHICLES_ALL: (q = '') => `vehicles:all:${q}`,
  VEHICLES_LIGHT: (q = '') => `vehicles:light:${q}`,
  VEHICLE_SINGLE: (id) => `vehicle:${id}`,
  ARTICLES_ALL: (q = '') => `articles:all:${q}`,
  ARTICLES_LIGHT: (q = '') => `articles:light:${q}`,
  ARTICLE_SINGLE: (id) => `article:${id}`,
  SEARCH: (q) => `search:${q}`,
};

// ─── Core Helpers ─────────────────────────────────────────────────────────────

function get(key) {
  try {
    return cache.get(key);  // returns undefined on miss
  } catch {
    return undefined;
  }
}

function set(key, value, ttl) {
  try {
    cache.set(key, value, ttl);
  } catch {
    // Non-fatal — cache write failure should never crash the request
  }
}

function del(key) {
  try {
    cache.del(key);
  } catch {}
}

/**
 * Flush all keys matching a prefix pattern (e.g. 'vehicles:')
 */
function flushPrefix(prefix) {
  try {
    const keys = cache.keys().filter(k => k.startsWith(prefix));
    if (keys.length > 0) cache.del(keys);
  } catch {}
}

function flushAll() {
  try {
    cache.flushAll();
  } catch {}
}

/**
 * Returns cache statistics for the health endpoint
 */
function stats() {
  try {
    return cache.getStats();
  } catch {
    return {};
  }
}

module.exports = { get, set, del, flushPrefix, flushAll, stats, TTL, KEYS };
