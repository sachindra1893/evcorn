/**
 * Reject inline Base64 / data:image payloads in article fields.
 * Images must be uploaded via POST /api/upload (Cloudinary) first; Mongo
 * stores only CDN URLs (or empty / external https URLs).
 */
const { BadRequestError } = require('../errors/AppError');

const DATA_IMAGE_RE = /data:image\//i;

function isDataImageUrl(value) {
  return typeof value === 'string' && DATA_IMAGE_RE.test(value);
}

function stringContainsDataImage(value) {
  return typeof value === 'string' && DATA_IMAGE_RE.test(value);
}

/**
 * Scan cover, paragraphs (__EVBLOCKS__), and optional blocks for data:image.
 * Throws BadRequestError — fail-closed so Base64 never reaches Mongo.
 */
function assertNoDataImageInArticle(data) {
  if (!data || typeof data !== 'object') return;

  if (isDataImageUrl(data.imageUrl)) {
    throw new BadRequestError(
      'Article cover imageUrl must be a Cloudinary CDN URL, not a Base64 data URL. Upload via POST /api/upload first.'
    );
  }

  if (data.media && typeof data.media === 'object') {
    if (isDataImageUrl(data.media.mainImage)) {
      throw new BadRequestError(
        'Article media.mainImage must not be a Base64 data URL. Upload via POST /api/upload first.'
      );
    }
  }

  if (data.cloudinaryImage && isDataImageUrl(data.cloudinaryImage.url)) {
    throw new BadRequestError(
      'Article cloudinaryImage.url must not be a Base64 data URL.'
    );
  }

  const paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : [];
  for (let i = 0; i < paragraphs.length; i++) {
    if (stringContainsDataImage(paragraphs[i])) {
      throw new BadRequestError(
        'Article body contains a Base64 data:image URL. Upload content images via POST /api/upload and store CDN URLs only.'
      );
    }
  }

  if (Array.isArray(data.blocks)) {
    const serialized = JSON.stringify(data.blocks);
    if (stringContainsDataImage(serialized)) {
      throw new BadRequestError(
        'Article blocks contain a Base64 data:image URL. Upload content images via POST /api/upload and store CDN URLs only.'
      );
    }
  }
}

module.exports = {
  isDataImageUrl,
  stringContainsDataImage,
  assertNoDataImageInArticle
};
