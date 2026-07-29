/**
 * Cloudinary Image Transformation & Optimization Helper
 * Automatically injects f_auto, q_auto, and responsive width constraints
 * while providing smart fallback images for known EV models and inline Data URI fallbacks.
 */

export const DEFAULT_PLACEHOLDER_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%23F1F5F9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="32" fill="%2394A3B8">⚡</text></svg>';

function slugify(text: string): string {
  if (!text) return '';
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export const KNOWN_EV_FALLBACK_IMAGES: Record<string, string> = {
  'syros-ev': 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=80',
  'syros': 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=80',
  'ev6': 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80',
  'ev9': 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=80',
  'nexon-ev': 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80',
  'punch-ev': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',
  'tiago-ev': 'https://images.unsplash.com/photo-1541348263662-e068662d82af?w=800&auto=format&fit=crop&q=80',
  'curvv-ev': 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80',
  'comet-ev': 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
  'zs-ev': 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&auto=format&fit=crop&q=80',
  'atto-3': 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&auto=format&fit=crop&q=80',
  'seal': 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&auto=format&fit=crop&q=80',
  'ioniq-5': 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80',
  'xuv400': 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80',
  'be-6e': 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80'
};

export function getOptimizedImageUrl(url: string | undefined | null, width?: number, modelName?: string): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    if (modelName) {
      const slug = slugify(modelName);
      if (KNOWN_EV_FALLBACK_IMAGES[slug]) {
        return KNOWN_EV_FALLBACK_IMAGES[slug];
      }
    }
    return DEFAULT_PLACEHOLDER_SVG;
  }

  // If not a Cloudinary URL, return as-is
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }

  // Already transformed, return as-is (unless requesting a different width)
  if (url.includes('/f_auto,q_auto') && !width) {
    return url;
  }

  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return url;

    let rest = parts[1];
    // Strip prior f_auto transformation segment when rebuilding width-specific URLs
    if (/^f_auto,q_auto[^/]*\//.test(rest)) {
      rest = rest.replace(/^[^/]+\//, '');
    }

    const transformationStr = width && width > 0
      ? `f_auto,q_auto,w_${width},c_limit`
      : 'f_auto,q_auto';

    return `${parts[0]}/upload/${transformationStr}/${rest}`;
  } catch (err) {
    return url;
  }
}

/**
 * Build a responsive srcset for Cloudinary (or single-URL fallback).
 * Does not change visuals — browsers pick the nearest width.
 */
export function getResponsiveSrcSet(
  url: string | undefined | null,
  widths: number[] = [400, 800, 1200],
  modelName?: string
): string {
  if (!url || !url.includes('res.cloudinary.com')) {
    const single = getOptimizedImageUrl(url, widths[widths.length - 1], modelName);
    return `${single} ${widths[widths.length - 1]}w`;
  }
  return widths
    .map((w) => `${getOptimizedImageUrl(url, w, modelName)} ${w}w`)
    .join(', ');
}

/**
 * Universal Image Error Handler
 * Unbinds error listener immediately to guarantee zero infinite loops.
 */
export function handleImageError(event: Event, modelName?: string): void {
  const img = (event.target || event.srcElement) as HTMLImageElement;
  if (img) {
    img.onerror = null; // UNBIND IMMEDIATELY TO PREVENT ANY LOOPS
    if (modelName) {
      const slug = slugify(modelName);
      if (KNOWN_EV_FALLBACK_IMAGES[slug]) {
        img.src = KNOWN_EV_FALLBACK_IMAGES[slug];
        img.style.opacity = '1';
        return;
      }
    }
    img.src = DEFAULT_PLACEHOLDER_SVG;
    img.style.opacity = '0.5';
  }
}
