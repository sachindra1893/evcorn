/**
 * Backend mirror of frontend entity-href / entity-slug (Phase 7.3 M4).
 * Search / sitemap-adjacent consumers must use these helpers — no ad-hoc URL builders.
 * Identity ≠ URL: brand path prefers display name slug (existing public routes).
 */

/** Match frontend `entitySlugify` so /ev/{brand}/{model} stays consistent. */
function entitySlugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/** Same resolve order as FE entity-id: parentModel → packed name → modelSlug. */
function resolveModelName(input = {}) {
  const parent = String(input.parentModel || '').trim();
  if (parent) return parent;

  const rawName = String(input.name || '').trim();
  if (rawName.includes('::')) {
    const packed = rawName.split('::')[0].trim();
    if (packed) return packed;
  }

  const slugField = String(input.modelSlug || '').trim();
  if (slugField) return slugField;

  return rawName;
}

function brandBrowseHref(brandNameOrSlug) {
  const slug = entitySlugify(brandNameOrSlug || '');
  if (!slug) return '/evs';
  return `/evs?category=${encodeURIComponent(slug)}`;
}

/**
 * Canonical model page path. Prefer brandName over brandSlug (existing URLs).
 * Returns undefined when a safe /ev/ link cannot be built.
 */
function modelHref(input = {}) {
  const brandPath = entitySlugify(
    String(input.brandName || '').trim() || String(input.brandSlug || '').trim()
  );
  const modelPath = entitySlugify(resolveModelName(input));
  if (!brandPath || !modelPath) return undefined;
  return `/ev/${brandPath}/${modelPath}`;
}

function articleHref(articleId) {
  const id = String(articleId || '').trim();
  return id ? `/articles/${id}` : undefined;
}

function compareHref(ids) {
  const list = Array.isArray(ids) ? ids : [];
  const clean = list.map((id) => String(id || '').trim()).filter(Boolean);
  if (!clean.length) return '/compare';
  return `/compare?ids=${clean.map((id) => encodeURIComponent(id)).join(',')}`;
}

module.exports = {
  entitySlugify,
  resolveModelName,
  brandBrowseHref,
  modelHref,
  articleHref,
  compareHref
};
