/**
 * EVCorn Enterprise API Query Builder & Validation Utility
 * Standardizes Pagination, Filtering, Sorting, Field Selection, Lean Queries, and Security Capping.
 */

// Whitelisted Parameters & Defaults
const ALLOWED_SORT_FIELDS = {
  price: 'pricing.exShowroomPriceINR',
  range: 'performance.claimedRangeKM',
  battery: 'battery.capacityKWh',
  name: 'name',
  publishedAt: 'publishedAt',
  createdAt: 'createdAt'
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse & Validate Query Parameters Safely
 */
function parseQueryParams(query) {
  // 1. Pagination Capping & Validation
  let page = query.page ? parseInt(query.page, 10) : undefined;
  if (page !== undefined && (isNaN(page) || page < 1)) page = 1;

  let limit = query.limit ? parseInt(query.limit, 10) : (page ? DEFAULT_LIMIT : undefined);
  if (limit !== undefined) {
    if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT; // Security Cap
  }

  // 2. Sorting Whitelist
  let sortField = 'name';
  let sortOrder = 1;
  if (query.sort && ALLOWED_SORT_FIELDS[query.sort]) {
    sortField = ALLOWED_SORT_FIELDS[query.sort];
  } else if (query.sort === 'publishedAt' || query.sort === 'createdAt') {
    sortField = query.sort;
  }

  if (query.order && query.order.toLowerCase() === 'desc') {
    sortOrder = -1;
  }

  // 3. Field Selection Projection
  let projection = null;
  if (query.fields && typeof query.fields === 'string') {
    const fieldsArr = query.fields.split(',').map(f => f.trim()).filter(Boolean);
    if (fieldsArr.length > 0) {
      projection = {};
      fieldsArr.forEach(f => {
        // Prevent internal field leaks unless requested
        if (f !== '__v' && f !== '_id') {
          projection[f] = 1;
        }
      });
      projection.id = 1; // Always include string slug id
    }
  }

  return {
    page,
    limit,
    sort: query.sort ? { [sortField]: sortOrder } : null,
    projection,
    formatEnvelope: Boolean(query.page || query.limit || query.format === 'envelope' || query.envelope === 'true')
  };
}

/**
 * Build Mongoose Filter Query from HTTP Request Query
 */
function buildVehicleFilterQuery(query) {
  const mongoQuery = {};

  // Brand / Category filter
  if (query.brand || query.categoryId || query.category) {
    mongoQuery.categoryId = (query.brand || query.categoryId || query.category).toLowerCase();
  }

  // Model filter
  if (query.model || query.parentModel) {
    mongoQuery.parentModel = new RegExp(`^${query.model || query.parentModel}$`, 'i');
  }

  // Status filter
  if (query.status) {
    mongoQuery.status = query.status;
  }

  // Price Min/Max Range ($gte, $lte)
  const priceMin = query.priceMin ? parseFloat(query.priceMin) : undefined;
  const priceMax = query.priceMax ? parseFloat(query.priceMax) : undefined;
  if (priceMin !== undefined || priceMax !== undefined) {
    mongoQuery['pricing.exShowroomPriceINR'] = {};
    if (!isNaN(priceMin)) mongoQuery['pricing.exShowroomPriceINR'].$gte = priceMin;
    if (!isNaN(priceMax)) mongoQuery['pricing.exShowroomPriceINR'].$lte = priceMax;
  }

  // Range Min/Max Filter ($gte, $lte)
  const rangeMin = query.rangeMin ? parseFloat(query.rangeMin) : undefined;
  const rangeMax = query.rangeMax ? parseFloat(query.rangeMax) : undefined;
  if (rangeMin !== undefined || rangeMax !== undefined) {
    mongoQuery['performance.claimedRangeKM'] = {};
    if (!isNaN(rangeMin)) mongoQuery['performance.claimedRangeKM'].$gte = rangeMin;
    if (!isNaN(rangeMax)) mongoQuery['performance.claimedRangeKM'].$lte = rangeMax;
  }

  // Battery Min/Max Filter ($gte, $lte)
  const batteryMin = query.batteryMin ? parseFloat(query.batteryMin) : undefined;
  const batteryMax = query.batteryMax ? parseFloat(query.batteryMax) : undefined;
  if (batteryMin !== undefined || batteryMax !== undefined) {
    mongoQuery['battery.capacityKWh'] = {};
    if (!isNaN(batteryMin)) mongoQuery['battery.capacityKWh'].$gte = batteryMin;
    if (!isNaN(batteryMax)) mongoQuery['battery.capacityKWh'].$lte = batteryMax;
  }

  // Search Keyword Filter
  if (query.search && typeof query.search === 'string') {
    const searchRegex = new RegExp(query.search.trim(), 'i');
    mongoQuery.$or = [
      { name: searchRegex },
      { parentModel: searchRegex },
      { variantName: searchRegex }
    ];
  }

  return mongoQuery;
}

/**
 * Build Mongoose Filter Query for Articles
 *
 * NOTE on publishAt/status tolerance (Root-Cause Cluster A fix):
 * Mongo's range/equality operators do NOT match documents where the field is
 * absent (e.g. `{ publishAt: { $lte: new Date() } }` silently excludes any
 * document missing `publishAt` entirely, and `{ status: 'published' }` excludes
 * a document where `status` is missing/null). Legacy/partially-written article
 * documents can be missing either field, which made real, active, published
 * articles invisible to every listing endpoint. Both conditions below treat a
 * missing field as "eligible" via an explicit `$exists: false` fallback, mirroring
 * the tolerance the `status` check already had.
 */
function buildArticleFilterQuery(query) {
  const mongoQuery = {};
  const andConditions = [];

  if (query.category || query.categoryId) {
    mongoQuery.categoryId = (query.category || query.categoryId).toLowerCase();
  }

  if (query.active !== undefined) {
    mongoQuery.active = query.active === 'true';
  } else if (!query.admin) {
    mongoQuery.active = true;
  }

  // Editorial Workflow Status Filtering
  if (query.status) {
    mongoQuery.status = query.status;
  } else if (!query.admin) {
    andConditions.push({
      $or: [{ status: 'published' }, { status: { $exists: false } }]
    });
    andConditions.push({
      $or: [{ publishAt: { $lte: new Date() } }, { publishAt: { $exists: false } }]
    });
  }

  if (query.search && typeof query.search === 'string') {
    const searchRegex = new RegExp(query.search.trim(), 'i');
    andConditions.push({
      $or: [{ title: searchRegex }, { description: searchRegex }]
    });
  }

  if (andConditions.length === 1) {
    Object.assign(mongoQuery, andConditions[0]);
  } else if (andConditions.length > 1) {
    mongoQuery.$and = andConditions;
  }

  return mongoQuery;
}

/**
 * Standardized Response Formatter
 */
function formatResponse(data, meta = null, envelope = false) {
  if (envelope || meta) {
    return {
      success: true,
      data,
      meta: meta || {
        page: 1,
        limit: data.length,
        total: data.length,
        pages: 1
      }
    };
  }
  return data;
}

module.exports = {
  parseQueryParams,
  buildVehicleFilterQuery,
  buildArticleFilterQuery,
  formatResponse,
  ALLOWED_SORT_FIELDS,
  MAX_LIMIT
};
