/**
 * File-DB query helpers — apply the same filter / sort / projection / page
 * shapes Mongo paths already use, without re-reading JSON or ignoring operators.
 *
 * Phase 5.3: File-DB previously only honored categoryId (vehicles) / categoryId+active
 * (articles), ignored $and/$or/$exists/$gte, and never projected light fields.
 * That made search/list paths return unbounded full documents at scale.
 */

function getPath(doc, path) {
  if (!path || typeof path !== 'string') return undefined;
  if (!path.includes('.')) return doc[path];
  const parts = path.split('.');
  let cur = doc;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function toComparable(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const t = Date.parse(value);
    if (!Number.isNaN(t)) return t;
  }
  return value;
}

function matchCondition(doc, key, condition) {
  if (key === '$and') {
    return Array.isArray(condition) && condition.every((c) => matchesFilter(doc, c));
  }
  if (key === '$or') {
    return Array.isArray(condition) && condition.some((c) => matchesFilter(doc, c));
  }
  if (key === '$nor') {
    return Array.isArray(condition) && !condition.some((c) => matchesFilter(doc, c));
  }

  const value = getPath(doc, key);

  if (condition instanceof RegExp) {
    return condition.test(value == null ? '' : String(value));
  }

  if (condition !== null && typeof condition === 'object' && !Array.isArray(condition)) {
    if (Object.prototype.hasOwnProperty.call(condition, '$exists')) {
      const exists = value !== undefined;
      if (condition.$exists !== exists) return false;
    }
    if (Object.prototype.hasOwnProperty.call(condition, '$gte')) {
      const av = toComparable(value);
      const bv = toComparable(condition.$gte);
      if (av == null || av < bv) return false;
    }
    if (Object.prototype.hasOwnProperty.call(condition, '$lte')) {
      const av = toComparable(value);
      const bv = toComparable(condition.$lte);
      if (av == null || av > bv) return false;
    }
    if (Object.prototype.hasOwnProperty.call(condition, '$gt')) {
      const av = toComparable(value);
      const bv = toComparable(condition.$gt);
      if (av == null || av <= bv) return false;
    }
    if (Object.prototype.hasOwnProperty.call(condition, '$lt')) {
      const av = toComparable(value);
      const bv = toComparable(condition.$lt);
      if (av == null || av >= bv) return false;
    }
    if (Object.prototype.hasOwnProperty.call(condition, '$in')) {
      if (!Array.isArray(condition.$in) || !condition.$in.includes(value)) return false;
    }
    if (Object.prototype.hasOwnProperty.call(condition, '$eq')) {
      if (value !== condition.$eq) return false;
    }
    if (Object.prototype.hasOwnProperty.call(condition, '$ne')) {
      if (value === condition.$ne) return false;
    }
    if (Object.prototype.hasOwnProperty.call(condition, '$regex')) {
      const flags = condition.$options || 'i';
      const re = condition.$regex instanceof RegExp
        ? condition.$regex
        : new RegExp(condition.$regex, flags);
      if (!re.test(value == null ? '' : String(value))) return false;
    }
    // Operator-only object fully evaluated above; plain nested equality objects
    // are not used by EVCorn filter builders.
    return true;
  }

  return value === condition;
}

function matchesFilter(doc, filterQuery = {}) {
  if (!filterQuery || typeof filterQuery !== 'object') return true;
  const keys = Object.keys(filterQuery);
  if (keys.length === 0) return true;
  return keys.every((key) => matchCondition(doc, key, filterQuery[key]));
}

/**
 * Inclusion string ("id name …"), inclusion object ({ id: 1 }), or
 * exclusion object ({ paragraphs: 0, blocks: 0 }).
 */
function projectDocument(doc, projection) {
  if (!projection) return doc;

  if (typeof projection === 'string') {
    const fields = projection.split(/\s+/).map((f) => f.trim()).filter(Boolean);
    if (fields.length === 0) return doc;
    const out = {};
    for (const field of fields) {
      if (field.includes('.')) {
        const [root, ...rest] = field.split('.');
        const nestedVal = getPath(doc, field);
        if (nestedVal === undefined) continue;
        out[root] = out[root] && typeof out[root] === 'object' ? out[root] : {};
        let cursor = out[root];
        for (let i = 0; i < rest.length - 1; i++) {
          cursor[rest[i]] = cursor[rest[i]] && typeof cursor[rest[i]] === 'object' ? cursor[rest[i]] : {};
          cursor = cursor[rest[i]];
        }
        cursor[rest[rest.length - 1]] = nestedVal;
        if (doc[root] && typeof doc[root] === 'object' && rest.length === 1) {
          // keep sibling keys out — already set single nested field
        }
      } else if (Object.prototype.hasOwnProperty.call(doc, field)) {
        out[field] = doc[field];
      }
    }
    // Always preserve id when present (list DTOs / FE trackBy)
    if (doc.id !== undefined && out.id === undefined) out.id = doc.id;
    return out;
  }

  if (typeof projection === 'object') {
    const entries = Object.entries(projection);
    if (entries.length === 0) return doc;

    const isExclusion = entries.every(([, v]) => v === 0 || v === false);
    if (isExclusion) {
      const out = { ...doc };
      for (const [key] of entries) {
        if (key.includes('.')) {
          const [root, child] = key.split('.');
          if (out[root] && typeof out[root] === 'object') {
            out[root] = { ...out[root] };
            delete out[root][child];
          }
        } else {
          delete out[key];
        }
      }
      return out;
    }

    const out = {};
    for (const [key, flag] of entries) {
      if (!flag) continue;
      if (key.includes('.')) {
        const val = getPath(doc, key);
        if (val === undefined) continue;
        const [root, ...rest] = key.split('.');
        out[root] = out[root] && typeof out[root] === 'object' ? { ...out[root] } : {};
        let cursor = out[root];
        for (let i = 0; i < rest.length - 1; i++) {
          cursor[rest[i]] = cursor[rest[i]] && typeof cursor[rest[i]] === 'object' ? { ...cursor[rest[i]] } : {};
          cursor = cursor[rest[i]];
        }
        cursor[rest[rest.length - 1]] = val;
      } else if (Object.prototype.hasOwnProperty.call(doc, key)) {
        out[key] = doc[key];
      }
    }
    if (doc.id !== undefined && out.id === undefined) out.id = doc.id;
    return out;
  }

  return doc;
}

function sortDocuments(docs, sort) {
  if (!sort || typeof sort !== 'object') return docs;
  const entries = Object.entries(sort);
  if (entries.length === 0) return docs;

  return docs.sort((a, b) => {
    for (const [field, dir] of entries) {
      const av = getPath(a, field);
      const bv = getPath(b, field);
      const aMissing = av === undefined || av === null;
      const bMissing = bv === undefined || bv === null;
      if (aMissing && bMissing) continue;
      if (aMissing) return 1;
      if (bMissing) return -1;
      if (av < bv) return dir < 0 ? 1 : -1;
      if (av > bv) return dir < 0 ? -1 : 1;
    }
    return 0;
  });
}

/**
 * Filter → sort → paginate → project. Always copies before sort so the
 * in-memory File-DB cache is never mutated by query paths.
 */
function queryDocuments(docs, filterQuery, projection, sort, skip = 0, limit = 0) {
  const source = Array.isArray(docs) ? docs : [];
  let result = source.filter((doc) => matchesFilter(doc, filterQuery));
  // Copy before sort — filter() already copies when anything is filtered, but
  // an empty filter would otherwise sort the live cache array in place.
  result = result.slice();
  sortDocuments(result, sort || { name: 1 });
  if (limit > 0) {
    result = result.slice(skip, skip + limit);
  } else if (skip > 0) {
    result = result.slice(skip);
  }
  if (projection) {
    result = result.map((doc) => projectDocument(doc, projection));
  }
  return result;
}

function countDocuments(docs, filterQuery) {
  const source = Array.isArray(docs) ? docs : [];
  return source.filter((doc) => matchesFilter(doc, filterQuery)).length;
}

module.exports = {
  matchesFilter,
  projectDocument,
  sortDocuments,
  queryDocuments,
  countDocuments,
  getPath
};
