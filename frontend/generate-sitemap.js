const fs = require('fs');
const https = require('https');
const path = require('path');

const API_URL = process.env.EVCORN_API_URL || 'https://evcorn-backend.onrender.com/api';
const SITE_URL = 'https://evcorn.com';

function fetchData(endpoint) {
  return new Promise((resolve, reject) => {
    const req = https.get(`${API_URL}/${endpoint}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy(new Error(`Timeout fetching ${endpoint}`));
    });
  });
}

async function fetchDataWithRetry(endpoint, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchData(endpoint);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

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

function urlEntry(loc, changefreq, priority, lastmod) {
  const lastmodLine = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : '';
  return `
  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodLine}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

async function generateSitemap() {
  console.log('Generating sitemap.xml...');

  try {
    const [articles, vehicles, categories] = await Promise.all([
      fetchDataWithRetry('articles?light=true').catch((err) => {
        console.warn('⚠️  articles fetch failed:', err.message || err);
        return [];
      }),
      fetchDataWithRetry('vehicles?light=true').catch((err) => {
        console.warn('⚠️  vehicles fetch failed:', err.message || err);
        return [];
      }),
      fetchDataWithRetry('categories').catch((err) => {
        console.warn('⚠️  categories fetch failed:', err.message || err);
        return [];
      })
    ]);

    const categoryNameById = new Map();
    if (Array.isArray(categories)) {
      for (const cat of categories) {
        if (cat && cat.id) categoryNameById.set(cat.id, cat.name || cat.id);
      }
    }

    // Public indexable routes only — never admin/login/api.
    const staticRoutes = [
      { path: '', priority: '1.0', changefreq: 'daily' },
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

    const today = new Date().toISOString().split('T')[0];
    for (const route of staticRoutes) {
      xml += urlEntry(`${SITE_URL}${route.path || ''}`, route.changefreq, route.priority, today);
    }

    // Article detail pages (id is the live route key; slug preferred when present for future-proof locs)
    if (Array.isArray(articles)) {
      for (const article of articles) {
        if (!article || article.active === false) continue;
        // Routes today resolve /articles/:id — prefer id for live route correctness.
        const locKey = article.id || article.slug;
        if (!locKey) continue;
        xml += urlEntry(
          `${SITE_URL}/articles/${locKey}`,
          'monthly',
          '0.7',
          toDate(article.updatedAt || article.publishAt || article.createdAt)
        );
      }
    }

    // Unique vehicle model pages: /ev/:brandSlug/:modelSlug
    const seenModels = new Set();
    if (Array.isArray(vehicles)) {
      for (const vehicle of vehicles) {
        if (!vehicle) continue;
        const status = String(vehicle.status || 'Launched').toLowerCase();
        if (status && status !== 'launched' && status !== 'upcoming') {
          continue;
        }

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
    }

    xml += `\n</urlset>\n`;

    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }

    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml);
    console.log(
      `✅ sitemap.xml generated (${staticRoutes.length} static, ` +
      `${Array.isArray(articles) ? articles.filter((a) => a && a.active !== false).length : 0} articles, ` +
      `${seenModels.size} vehicle models)`
    );
  } catch (error) {
    console.error('❌ Failed to generate sitemap:', error);
    process.exit(1);
  }
}

generateSitemap();
