/**
 * Dynamic XML sitemap builder (aligned with frontend/generate-sitemap.js).
 * Excludes admin/login; scales to thousands of article + vehicle model URLs.
 */

const SITE_URL = 'https://evcorn.com';

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Extract parent model from `Model::Variant` naming used in the catalog. */
function parentModelName(vehicle) {
  const explicit = (vehicle && vehicle.parentModel) || '';
  if (explicit) return explicit;
  const name = String((vehicle && vehicle.name) || '');
  const idx = name.indexOf('::');
  return idx >= 0 ? name.slice(0, idx).trim() : name.trim();
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function urlEntry(loc, changefreq, priority, lastmod) {
  const lastmodLine = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : '';
  return `
  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodLine}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

/**
 * @param {{ articles?: any[], vehicles?: any[], categories?: any[] }} data
 * @returns {string}
 */
function buildSitemapXml(data = {}) {
  const articles = Array.isArray(data.articles) ? data.articles : [];
  const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];

  const categoryNameById = new Map();
  for (const cat of categories) {
    if (cat && cat.id) categoryNameById.set(cat.id, cat.name || cat.id);
  }

  const today = new Date().toISOString().split('T')[0];
  const staticRoutes = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/evs', priority: '0.9', changefreq: 'daily' },
    { path: '/two-wheelers', priority: '0.9', changefreq: 'daily' },
    { path: '/compare', priority: '0.8', changefreq: 'weekly' },
    { path: '/articles', priority: '0.9', changefreq: 'daily' },
    { path: '/about', priority: '0.6', changefreq: 'monthly' },
    { path: '/search', priority: '0.5', changefreq: 'weekly' },
    { path: '/terms', priority: '0.3', changefreq: 'yearly' },
    { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
    { path: '/faqs', priority: '0.5', changefreq: 'monthly' },
    { path: '/feedback', priority: '0.3', changefreq: 'yearly' },
    { path: '/contact', priority: '0.4', changefreq: 'yearly' },
    { path: '/advertise', priority: '0.4', changefreq: 'yearly' }
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  for (const route of staticRoutes) {
    const loc = route.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${route.path}`;
    xml += urlEntry(loc, route.changefreq, route.priority, today);
  }

  for (const article of articles) {
    if (!article || article.active === false) continue;
    const id = article._id ? article._id.toString() : (article.id || article.slug);
    if (!id) continue;
    xml += urlEntry(
      `${SITE_URL}/articles/${id}`,
      'monthly',
      '0.7',
      toDate(article.updatedAt || article.publishAt || article.createdAt)
    );
  }

  const seenModels = new Set();
  for (const vehicle of vehicles) {
    if (!vehicle) continue;
    const status = String(vehicle.status || 'Published').toLowerCase();
    if (status && status !== 'published' && status !== 'active') continue;

    const brandName =
      categoryNameById.get(vehicle.categoryId) ||
      vehicle.brandSlug ||
      vehicle.categoryId ||
      '';
    const brandSlug = slugify(brandName);
    // Collapse variants (Model::Variant) onto one /ev/:brand/:model URL.
    const modelSlug = slugify(parentModelName(vehicle) || vehicle.modelSlug || '');
    if (!brandSlug || !modelSlug) continue;

    const key = `${brandSlug}/${modelSlug}`;
    if (seenModels.has(key)) continue;
    seenModels.add(key);

    xml += urlEntry(
      `${SITE_URL}/ev/${brandSlug}/${modelSlug}`,
      'weekly',
      '0.8',
      toDate(vehicle.updatedAt || vehicle.publishedAt || vehicle.createdAt)
    );
  }

  xml += '\n</urlset>';
  return xml;
}

module.exports = {
  buildSitemapXml,
  slugify,
  SITE_URL
};
