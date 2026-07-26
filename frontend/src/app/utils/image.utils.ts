/**
 * Cloudinary Image Transformation & Optimization Helper
 * Automatically injects f_auto, q_auto, and responsive width constraints
 * while providing inline Data URI fallbacks for missing images.
 */

export const DEFAULT_PLACEHOLDER_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%23F1F5F9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="32" fill="%2394A3B8">⚡</text></svg>';

export function getOptimizedImageUrl(url: string | undefined | null, width?: number): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return DEFAULT_PLACEHOLDER_SVG;
  }

  // If not a Cloudinary URL, return as-is
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }

  // Already transformed, return as-is
  if (url.includes('/f_auto,q_auto')) {
    return url;
  }

  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return url;

    const transformationStr = width && width > 0 
      ? `f_auto,q_auto,w_${width},c_limit`
      : 'f_auto,q_auto';

    return `${parts[0]}/upload/${transformationStr}/${parts[1]}`;
  } catch (err) {
    return url;
  }
}

/**
 * Universal Image Error Handler
 * Unbinds error listener immediately to guarantee zero infinite loops.
 */
export function handleImageError(event: Event): void {
  const img = (event.target || event.srcElement) as HTMLImageElement;
  if (img) {
    img.onerror = null; // UNBIND IMMEDIATELY TO PREVENT ANY LOOPS
    img.src = DEFAULT_PLACEHOLDER_SVG;
    img.style.opacity = '0.5';
  }
}
