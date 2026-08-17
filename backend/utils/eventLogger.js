/**
 * Lightweight, non-blocking (fire-and-forget) event logger.
 * Writes minimalist event records to MongoDB Atlas without awaiting or slowing down user requests.
 */
const mongoose = require('mongoose');
const Event = require('../models/Event');
const logger = require('./logger');

// In-memory test store when Mongoose is disconnected in local unit tests
const testEvents = [];

function logEvent(type) {
  if (!type || typeof type !== 'string') return;

  try {
    if (mongoose.connection.readyState === 1) {
      // Fire-and-forget write to MongoDB Atlas — explicitly un-awaited promise with error catch
      Event.create({ type: type.trim(), createdAt: new Date() }).catch((err) => {
        logger.warn(`Fire-and-forget event log notice: ${err.message}`);
      });
    } else {
      // Local test environment store
      testEvents.push({ type: type.trim(), createdAt: new Date() });
    }
  } catch (e) {
    // Non-fatal safety net — logging must never crash or block requests
  }
}

function _getTestEvents() {
  return testEvents;
}

function _clearTestEvents() {
  testEvents.length = 0;
}

module.exports = {
  logEvent,
  _getTestEvents,
  _clearTestEvents
};
