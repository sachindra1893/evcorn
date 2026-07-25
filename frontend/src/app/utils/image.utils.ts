/**
 * Cloudinary Image Transformation & Optimization Helper
 * Automatically injects f_auto, q_auto, and responsive width constraints
 * while preserving fallback support for non-Cloudinary static URLs.
 * 
 * @param url Original image URL
 * @param width Target width in pixels (optional)
 * @returns Transformed & optimized image URL
 */
export function getOptimizedImageUrl(url: string | undefined | null, width?: number): string {
  if (!url || typeof url !== 'string') {
    return '';
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
