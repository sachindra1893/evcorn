/**
 * Shared API Constants
 * Eliminates magic numbers and hardcoded strings across the codebase.
 */
module.exports = {
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },
  SORT_FIELDS: {
    price: 'pricing.exShowroomPriceINR',
    range: 'performance.claimedRangeKM',
    battery: 'battery.capacityKWh',
    name: 'name',
    publishedAt: 'publishedAt',
    createdAt: 'createdAt'
  },
  VEHICLE_STATUS: ['Published', 'Upcoming', 'Discontinued'],
  IMAGE_FOLDER: 'evcorn',
  ERROR_CODES: {
    UNAUTHORIZED: 'UNAUTHORIZED_ACCESS',
    NOT_FOUND: 'RESOURCE_NOT_FOUND',
    BAD_REQUEST: 'INVALID_REQUEST_PAYLOAD',
    INTERNAL_ERROR: 'INTERNAL_SERVER_ERROR'
  }
};
