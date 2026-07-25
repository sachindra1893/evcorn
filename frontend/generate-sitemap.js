const fs = require('fs');
const https = require('https');
const path = require('path');

const API_URL = 'https://evcorn-backend.onrender.com/api';
const SITE_URL = 'https://evcorn.com';

function fetchData(endpoint) {
  return new Promise((resolve, reject) => {
    https.get(`${API_URL}/${endpoint}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

async function generateSitemap() {
  console.log('Generating sitemap.xml...');

  try {
    // Fetch dynamic content
    const articles = await fetchData('articles?light=true').catch(() => []);
    const vehicles = await fetchData('vehicles?light=true').catch(() => []);

    const staticRoutes = [
      '', // Home
      '/compare',
      '/energy',
      '/charging',
      '/articles',
      '/about',
      '/search',
      '/terms',
      '/privacy',
      '/faqs',
      '/feedback',
      '/contact',
      '/advertise'
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static Pages
    staticRoutes.forEach(route => {
      xml += `
  <url>
    <loc>${SITE_URL}${route}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route === '' ? '1.0' : '0.8'}</priority>
  </url>`;
    });

    // Article Pages
    if (Array.isArray(articles)) {
      articles.filter(a => a.active).forEach(article => {
        xml += `
  <url>
    <loc>${SITE_URL}/articles/${escapeXml(article.id)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
      });
    }

    // Vehicle Compare Pre-selections (optional, but good for SEO)
    // We can index /compare?model=modelName if we wanted, but standard SEO practice for query params is tricky.
    // For now, EVCorn doesn't have individual vehicle pages yet, only a Compare page.

    xml += `\n</urlset>`;

    // Write to public folder (Angular 17+ static assets)
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }
    
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml);
    console.log('✅ sitemap.xml successfully generated at public/sitemap.xml');

  } catch (error) {
    console.error('❌ Failed to generate sitemap:', error);
    process.exit(1);
  }
}

generateSitemap();
