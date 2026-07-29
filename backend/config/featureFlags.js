/**
 * Enterprise Feature Flag System
 * Lightweight, environment-configurable feature toggles.
 */
const flags = {
  ENABLE_ADVANCED_SEARCH: process.env.FLAG_ENABLE_ADVANCED_SEARCH !== 'false',
  ENABLE_ANALYTICS_TELEMETRY: process.env.FLAG_ENABLE_ANALYTICS_TELEMETRY !== 'false',
  ENABLE_EDITORIAL_WORKFLOW: process.env.FLAG_ENABLE_EDITORIAL_WORKFLOW !== 'false',
  ENABLE_COMMUNITY_FEATURES: process.env.FLAG_ENABLE_COMMUNITY_FEATURES === 'true',
  ENABLE_AI_RECOMMENDATIONS: process.env.FLAG_ENABLE_AI_RECOMMENDATIONS === 'true',
  /** Phase 5.1 Compare EVs MVP — default on; set FLAG_ENABLE_COMPARE=false to disable ops-side. */
  ENABLE_COMPARE: process.env.FLAG_ENABLE_COMPARE !== 'false'
};

function isFeatureEnabled(flagName) {
  return flags[flagName] === true;
}

function getFeatureFlags() {
  return { ...flags };
}

module.exports = {
  isFeatureEnabled,
  getFeatureFlags
};
