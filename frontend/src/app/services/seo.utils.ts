import {
  META_DESC_MAX,
  META_DESC_MIN,
  SITE_NAME,
  SITE_ORIGIN
} from './seo.constants';

/**
 * Build a document title without duplicating the site suffix.
 * Callers may pass either a bare page title or one that already includes `| EVCorn`.
 */
export function formatSeoTitle(pageTitle: string, siteName: string = SITE_NAME): string {
  const raw = (pageTitle || '').trim();
  if (!raw) return siteName;
  const suffix = ` | ${siteName}`;
  if (raw === siteName || raw.endsWith(suffix) || raw.endsWith(` - ${siteName}`)) {
    return raw;
  }
  const stripped = raw.replace(new RegExp(`\\s*[|–-]\\s*${escapeRegExp(siteName)}\\s*$`, 'i'), '').trim();
  return `${stripped || raw}${suffix}`;
}

/** Clamp description to META_DESC_MAX at a word boundary; leave short unique copy alone. */
export function formatMetaDescription(description: string, fallback = ''): string {
  let text = (description || '').replace(/\s+/g, ' ').trim();
  if (!text) text = (fallback || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  if (text.length <= META_DESC_MAX) {
    return text;
  }

  const sliced = text.slice(0, META_DESC_MAX);
  const lastSpace = sliced.lastIndexOf(' ');
  const truncated = (lastSpace > META_DESC_MIN - 20 ? sliced.slice(0, lastSpace) : sliced).trim();
  return truncated.replace(/[.,;:!?-]+$/, '') + '…';
}

/**
 * Absolute asset/page URL.
 * - Relative paths → production origin
 * - Absolute URLs (Cloudinary, etc.) → left unchanged
 */
export function toAbsoluteUrl(pathOrUrl?: string, origin: string = SITE_ORIGIN): string {
  if (!pathOrUrl) return origin;
  const value = pathOrUrl.trim();
  if (/^https?:\/\//i.test(value) || value.startsWith('//')) {
    return value.startsWith('//') ? `https:${value}` : value;
  }
  if (value.startsWith('data:')) return value;
  const path = value.startsWith('/') ? value : `/${value}`;
  return `${origin}${path}`.replace(/([^:]\/)\/+/g, '$1');
}

/**
 * Canonical/page URL forced onto the production origin.
 * By default drops query/hash; set keepQuery=true for intentional query canons.
 */
export function toCanonicalUrl(
  pathOrUrl?: string,
  options: { keepQuery?: boolean; origin?: string } = {}
): string {
  const origin = options.origin || SITE_ORIGIN;
  let pathname = '/';
  let search = '';
  const raw = (pathOrUrl || '/').trim();

  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      pathname = u.pathname || '/';
      search = u.search || '';
    } else {
      const u = new URL(raw.startsWith('/') ? raw : `/${raw}`, origin);
      pathname = u.pathname || '/';
      search = u.search || '';
    }
  } catch {
    pathname = raw.split('?')[0] || '/';
    if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  }

  if (pathname !== '/' && pathname.endsWith('/')) {
    pathname = pathname.replace(/\/+$/, '');
  }

  const query = options.keepQuery ? search : '';
  if (pathname === '/') {
    return `${origin}/${query}`;
  }
  return `${origin}${pathname}${query}`;
}

export function slugifySeo(text: string): string {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
