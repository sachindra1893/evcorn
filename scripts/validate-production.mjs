#!/usr/bin/env node
/**
 * Post-deploy validation against LIVE production (or a preview / local combo).
 * Not run on PR CI — invoke manually or via workflow_dispatch after deploy.
 *
 * Usage:
 *   PROD_WEB=https://evcorn.com PROD_API=https://evcorn-backend.onrender.com/api \
 *     node scripts/validate-production.mjs
 *
 * Aliases: FRONTEND_URL / PRODUCTION_URL → PROD_WEB; API_URL → PROD_API
 * Optional: VERCEL_PROTECTION_BYPASS (x-vercel-protection-bypass) for SSO-protected previews
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'artifacts');
const OUT_FILE = path.join(OUT_DIR, 'production-validate-results.json');

const PROD_WEB = (
  process.env.PROD_WEB ||
  process.env.FRONTEND_URL ||
  process.env.PRODUCTION_URL ||
  'https://evcorn.com'
).replace(/\/$/, '');
const PROD_API = (
  process.env.PROD_API ||
  process.env.API_URL ||
  'https://evcorn-backend.onrender.com/api'
).replace(/\/$/, '');
const PROTECTION_BYPASS =
  process.env.VERCEL_PROTECTION_BYPASS ||
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
  '';

const WEB_ROUTES = ['/', '/evs', '/articles', '/search', '/compare'];
const WEB_STATIC = [
  {
    path: '/robots.txt',
    mustInclude: 'Sitemap:',
    expectContentType: /text\/plain/i,
    expectCacheControl: /max-age=3600/i
  },
  {
    path: '/favicon.ico',
    binaryOk: true,
    expectCacheControl: /max-age=31536000|immutable/i
  },
  {
    path: '/site.webmanifest',
    kind: 'manifest',
    expectCacheControl: /max-age=3600/i
  },
  {
    path: '/sitemap.xml',
    mustInclude: '<urlset',
    expectContentType: /xml/i,
    expectCacheControl: /max-age=3600/i
  }
];
const API_ROUTES = [
  { path: '/health', requireRequestId: true, requireDependencies: true },
  { path: '/health/live', requireNoStore: true },
  { path: '/health/ready', allow: [200, 503], requireNoStore: true },
  { path: '/vehicles?status=Published&limit=5', requireNonEmpty: true },
  { path: '/articles?limit=5' }
];

function baseHeaders() {
  const headers = { Accept: '*/*' };
  if (PROTECTION_BYPASS) {
    // Header-only bypass. Do NOT set x-vercel-set-bypass-cookie — that returns
    // a same-URL 307 which loops under fetch({ redirect: 'follow' }).
    headers['x-vercel-protection-bypass'] = PROTECTION_BYPASS;
  }
  return headers;
}

function contentTypeOk(header, pattern) {
  if (!pattern) return true;
  return pattern.test(header || '');
}

function isHtmlContentType(ct) {
  return /text\/html/i.test(ct || '');
}

function looksLikeSpaHtml(text) {
  return (
    /<!doctype\s+html/i.test(text) ||
    /<html[\s>]/i.test(text) ||
    /<title>[\s\S]*?<\/title>/i.test(text)
  );
}

function validateManifestBody(text, contentType) {
  const issues = [];
  if (isHtmlContentType(contentType) || looksLikeSpaHtml(text)) {
    issues.push('SPA/HTML fallback (expected web manifest JSON)');
  }
  if (!/application\/(manifest\+json|json)/i.test(contentType || '')) {
    issues.push(`bad Content-Type: ${contentType || '(missing)'}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    issues.push('body is not valid JSON');
    return { issues, parsed: null };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    issues.push('manifest root must be a JSON object');
    return { issues, parsed };
  }
  if (typeof parsed.name !== 'string' || !parsed.name.trim()) {
    issues.push('missing name');
  }
  if (typeof parsed.short_name !== 'string' || !parsed.short_name.trim()) {
    issues.push('missing short_name');
  }
  if (!Array.isArray(parsed.icons) || parsed.icons.length === 0) {
    issues.push('missing icons[]');
  } else if (!parsed.icons.every((i) => i && typeof i.src === 'string' && i.src)) {
    issues.push('icons[] entries require src');
  }
  return { issues, parsed };
}

async function checkWeb(route) {
  const url = `${PROD_WEB}${route}`;
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: 'follow', headers: baseHeaders() });
    const text = await res.text();
    const ms = Date.now() - started;
    const hasTitle = /<title>[^<]+<\/title>/i.test(text);
    const pass = res.status < 400 && hasTitle && text.length > 200;
    return { type: 'web', route, url, status: res.status, ms, pass, hasTitle };
  } catch (err) {
    return { type: 'web', route, url, pass: false, error: String(err.message || err) };
  }
}

async function checkStatic(spec) {
  const url = `${PROD_WEB}${spec.path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: 'follow', headers: baseHeaders() });
    const ms = Date.now() - started;
    const contentType = res.headers.get('content-type') || '';
    const cacheControl = res.headers.get('cache-control') || '';
    const issues = [];
    let pass = res.status < 400;

    if (spec.kind === 'manifest') {
      const text = await res.text();
      const { issues: manifestIssues, parsed } = validateManifestBody(text, contentType);
      issues.push(...manifestIssues);
      if (spec.expectCacheControl && !spec.expectCacheControl.test(cacheControl)) {
        issues.push(`bad Cache-Control: ${cacheControl || '(missing)'}`);
      }
      pass = pass && issues.length === 0;
      return {
        type: 'static',
        route: spec.path,
        url,
        status: res.status,
        ms,
        contentType,
        cacheControl: cacheControl || null,
        manifestName: parsed?.name || null,
        issues,
        pass
      };
    }

    if (spec.binaryOk) {
      const buf = await res.arrayBuffer();
      if (!(Number(res.headers.get('content-length') || buf.byteLength) > 0)) {
        issues.push('empty body');
      }
      if (isHtmlContentType(contentType) || looksLikeSpaHtml(Buffer.from(buf).toString('utf8', 0, 200))) {
        issues.push('HTML fallback for binary asset');
      }
    } else {
      const text = await res.text();
      if (spec.mustInclude && !text.includes(spec.mustInclude)) {
        issues.push(`missing required substring: ${spec.mustInclude}`);
      }
      if (text.length < 8) issues.push('body too short');
      if (isHtmlContentType(contentType) || looksLikeSpaHtml(text)) {
        issues.push('HTML/SPA fallback');
      }
      if (spec.expectContentType && !contentTypeOk(contentType, spec.expectContentType)) {
        issues.push(`bad Content-Type: ${contentType || '(missing)'}`);
      }
    }

    if (spec.expectCacheControl && !spec.expectCacheControl.test(cacheControl)) {
      issues.push(`bad Cache-Control: ${cacheControl || '(missing)'}`);
    }

    pass = pass && issues.length === 0;
    return {
      type: 'static',
      route: spec.path,
      url,
      status: res.status,
      ms,
      contentType: contentType || null,
      cacheControl: cacheControl || null,
      issues,
      pass
    };
  } catch (err) {
    return { type: 'static', route: spec.path, url, pass: false, error: String(err.message || err) };
  }
}

async function checkHashedAsset() {
  const homeUrl = `${PROD_WEB}/`;
  const started = Date.now();
  try {
    const home = await fetch(homeUrl, { redirect: 'follow', headers: baseHeaders() });
    const html = await home.text();
    // Angular emits relative hashed assets (src="main-XXXX.js"), not always "/main-…".
    const jsMatch = html.match(/src="(\/?[^"]+\.js)"/i);
    if (!jsMatch) {
      return {
        type: 'static',
        route: '(hashed-js)',
        url: homeUrl,
        pass: false,
        issues: ['no hashed .js src found in index HTML']
      };
    }
    let assetPath = jsMatch[1];
    // Skip third-party scripts (e.g. vercel.live feedback).
    if (/^https?:\/\//i.test(assetPath) || /vercel\.live/i.test(assetPath)) {
      const local = [...html.matchAll(/src="(\/?[^"]+\.js)"/gi)]
        .map((m) => m[1])
        .find((p) => !/^https?:\/\//i.test(p) && !/vercel\.live/i.test(p));
      if (!local) {
        return {
          type: 'static',
          route: '(hashed-js)',
          url: homeUrl,
          pass: false,
          issues: ['no local hashed .js src found in index HTML']
        };
      }
      assetPath = local;
    }
    if (!assetPath.startsWith('/')) assetPath = `/${assetPath}`;
    const url = `${PROD_WEB}${assetPath}`;
    const res = await fetch(url, { redirect: 'follow', headers: baseHeaders() });
    const ms = Date.now() - started;
    const contentType = res.headers.get('content-type') || '';
    const cacheControl = res.headers.get('cache-control') || '';
    const issues = [];
    if (res.status >= 400) issues.push(`status ${res.status}`);
    if (!/javascript|ecmascript/i.test(contentType)) {
      issues.push(`bad Content-Type: ${contentType || '(missing)'}`);
    }
    if (!/max-age=31536000/i.test(cacheControl) || !/immutable/i.test(cacheControl)) {
      issues.push(`bad Cache-Control: ${cacheControl || '(missing)'}`);
    }
    // consume
    await res.arrayBuffer();
    return {
      type: 'static',
      route: assetPath,
      url,
      status: res.status,
      ms,
      contentType,
      cacheControl: cacheControl || null,
      issues,
      pass: issues.length === 0
    };
  } catch (err) {
    return {
      type: 'static',
      route: '(hashed-js)',
      url: homeUrl,
      pass: false,
      error: String(err.message || err)
    };
  }
}

async function checkApi(spec) {
  const url = `${PROD_API}${spec.path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        ...baseHeaders(),
        'x-request-id': `prod-validate-${Date.now()}`
      }
    });
    const ms = Date.now() - started;
    const allow = spec.allow || [200];
    const requestId = res.headers.get('x-request-id');
    const serverTiming = res.headers.get('server-timing');
    const cacheControl = res.headers.get('cache-control') || '';
    let body;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    let pass = allow.includes(res.status);
    const issues = [];
    if (spec.requireRequestId && !requestId) {
      pass = false;
      issues.push('missing x-request-id');
    }
    if (spec.requireNoStore && !/no-store/i.test(cacheControl)) {
      pass = false;
      issues.push(`expected no-store, got: ${cacheControl || '(missing)'}`);
    }
    if (spec.requireDependencies) {
      if (!body?.dependencies?.database?.status || !body?.dependencies?.cloudinary?.status) {
        pass = false;
        issues.push('missing dependencies.database/cloudinary');
      }
    }
    if (spec.requireNonEmpty) {
      const arr = Array.isArray(body) ? body : body?.data;
      if (!Array.isArray(arr) || arr.length === 0) {
        pass = false;
        issues.push('empty list payload');
      }
    }
    return {
      type: 'api',
      route: spec.path,
      url,
      status: res.status,
      ms,
      requestId,
      serverTiming: serverTiming || null,
      cacheControl: cacheControl || null,
      issues,
      pass
    };
  } catch (err) {
    return { type: 'api', route: spec.path, url, pass: false, error: String(err.message || err) };
  }
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Validating production targets\n  WEB=${PROD_WEB}\n  API=${PROD_API}`);
  if (PROTECTION_BYPASS) console.log('  (VERCEL protection bypass header enabled)\n');
  else console.log('');

  const results = [];
  for (const route of WEB_ROUTES) {
    const r = await checkWeb(route);
    results.push(r);
    console.log(`${r.pass ? 'PASS' : 'FAIL'} WEB ${route} ${r.status || ''} ${r.ms || ''}ms`);
  }
  for (const spec of WEB_STATIC) {
    const r = await checkStatic(spec);
    results.push(r);
    const detail = r.issues?.length ? ` — ${r.issues.join('; ')}` : '';
    console.log(
      `${r.pass ? 'PASS' : 'FAIL'} STATIC ${spec.path} ${r.status || ''} ${r.ms || ''}ms${detail}`
    );
  }
  {
    const r = await checkHashedAsset();
    results.push(r);
    const detail = r.issues?.length ? ` — ${r.issues.join('; ')}` : '';
    console.log(
      `${r.pass ? 'PASS' : 'FAIL'} STATIC ${r.route} ${r.status || ''} ${r.ms || ''}ms${detail}`
    );
  }
  for (const spec of API_ROUTES) {
    const r = await checkApi(spec);
    results.push(r);
    const detail = r.issues?.length ? ` — ${r.issues.join('; ')}` : '';
    console.log(
      `${r.pass ? 'PASS' : 'FAIL'} API ${spec.path} ${r.status || ''} ${r.ms || ''}ms` +
        (r.requestId ? ` rid=${r.requestId}` : '') +
        detail
    );
  }

  const pass = results.every((r) => r.pass);
  const report = {
    generatedAt: new Date().toISOString(),
    prodWeb: PROD_WEB,
    prodApi: PROD_API,
    protectionBypass: Boolean(PROTECTION_BYPASS),
    pass,
    results
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nProduction validate ${pass ? 'PASS' : 'FAIL'} → ${OUT_FILE}`);
  console.log(pass ? 'COMPLETE — production looks healthy.' : 'STOP — do not mark release complete.');
  process.exit(pass ? 0 : 1);
}

run();
