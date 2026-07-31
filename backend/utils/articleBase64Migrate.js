/**
 * Helpers for one-time migration of article Base64 data:image URLs → CDN URLs.
 * Pure transform/scan logic — upload I/O is injected by the caller.
 */
const { isDataImageUrl } = require('./articleImageSanitize');

const EVBLOCKS_PREFIX = '__EVBLOCKS__';
const HTTP_URL_RE = /^https?:\/\//i;
const CLOUDINARY_HOST_RE = /res\.cloudinary\.com/i;

function isHttpImageUrl(value) {
  return typeof value === 'string' && HTTP_URL_RE.test(value.trim());
}

function isCloudinaryUrl(value) {
  return typeof value === 'string' && CLOUDINARY_HOST_RE.test(value);
}

/** Leave existing CDN / http(s) URLs unchanged; only migrate data:image. */
function shouldMigrateImageUrl(value) {
  return isDataImageUrl(value);
}

/**
 * Decode a data:image/...;base64,... URL into a Buffer + mime hint.
 * @returns {{ buffer: Buffer, mime: string, ext: string }}
 */
function dataUrlToBuffer(dataUrl) {
  if (!isDataImageUrl(dataUrl)) {
    throw new Error('Not a data:image URL');
  }
  const comma = dataUrl.indexOf(',');
  if (comma < 0) {
    throw new Error('Invalid data URL (missing comma)');
  }
  const header = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  const mime = (/data:([^;]+)/i.exec(header)?.[1] || 'image/jpeg').toLowerCase();
  const isBase64 = /;base64/i.test(header);
  const buffer = Buffer.from(payload, isBase64 ? 'base64' : 'utf8');
  const ext =
    mime.includes('png') ? 'png'
      : mime.includes('webp') ? 'webp'
        : mime.includes('gif') ? 'gif'
          : 'jpg';
  return { buffer, mime, ext };
}

/**
 * Visit known image URL fields on a block tree (image / gallery / comparison).
 * @param {Array} blocks
 * @param {(accessor: { get: () => string, set: (url: string) => void, location: string }) => void} visit
 * @param {string} [prefix]
 */
function forEachBlockImageUrl(blocks, visit, prefix = 'blocks') {
  if (!Array.isArray(blocks)) return;

  blocks.forEach((block, i) => {
    if (!block || typeof block !== 'object' || !block.data) return;
    const loc = `${prefix}[${i}:${block.type || '?'}]`;
    const data = block.data;

    if (block.type === 'image') {
      visit({
        get: () => (typeof data.url === 'string' ? data.url : ''),
        set: (url) => { data.url = url; },
        location: `${loc}.data.url`
      });
    } else if (block.type === 'gallery') {
      const images = Array.isArray(data.images) ? data.images : [];
      images.forEach((img, j) => {
        if (!img || typeof img !== 'object') return;
        visit({
          get: () => (typeof img.url === 'string' ? img.url : ''),
          set: (url) => { img.url = url; },
          location: `${loc}.data.images[${j}].url`
        });
      });
    } else if (block.type === 'comparison') {
      const items = Array.isArray(data.items) ? data.items : [];
      items.forEach((card, j) => {
        if (!card || typeof card !== 'object') return;
        visit({
          get: () => (typeof card.image === 'string' ? card.image : ''),
          set: (url) => { card.image = url; },
          location: `${loc}.data.items[${j}].image`
        });
      });
    }
  });
}

/**
 * Visit cover + legacy media mirrors + author + __EVBLOCKS__ / blocks image fields.
 * Mutates `article` when accessors call set().
 */
function forEachArticleImageUrl(article, visit) {
  if (!article || typeof article !== 'object') return;

  visit({
    get: () => (typeof article.imageUrl === 'string' ? article.imageUrl : ''),
    set: (url) => { article.imageUrl = url; },
    location: 'imageUrl'
  });

  if (article.media && typeof article.media === 'object') {
    visit({
      get: () => (typeof article.media.url === 'string' ? article.media.url : ''),
      set: (url) => { article.media.url = url; },
      location: 'media.url'
    });
    visit({
      get: () => (typeof article.media.mainImage === 'string' ? article.media.mainImage : ''),
      set: (url) => { article.media.mainImage = url; },
      location: 'media.mainImage'
    });
  }

  if (article.cloudinaryImage && typeof article.cloudinaryImage === 'object') {
    visit({
      get: () => (typeof article.cloudinaryImage.url === 'string' ? article.cloudinaryImage.url : ''),
      set: (url) => { article.cloudinaryImage.url = url; },
      location: 'cloudinaryImage.url'
    });
  }

  if (Array.isArray(article.cloudinaryImages)) {
    article.cloudinaryImages.forEach((img, i) => {
      if (!img || typeof img !== 'object') return;
      visit({
        get: () => (typeof img.url === 'string' ? img.url : ''),
        set: (url) => { img.url = url; },
        location: `cloudinaryImages[${i}].url`
      });
    });
  }

  if (article.author && typeof article.author === 'object') {
    visit({
      get: () => (typeof article.author.imageUrl === 'string' ? article.author.imageUrl : ''),
      set: (url) => { article.author.imageUrl = url; },
      location: 'author.imageUrl'
    });
  }

  if (Array.isArray(article.blocks)) {
    forEachBlockImageUrl(article.blocks, visit, 'blocks');
  }

  if (Array.isArray(article.paragraphs)) {
    article.paragraphs.forEach((para, pi) => {
      if (typeof para !== 'string' || !para.startsWith(EVBLOCKS_PREFIX)) return;
      let blocks;
      try {
        blocks = JSON.parse(para.slice(EVBLOCKS_PREFIX.length));
      } catch {
        return;
      }
      if (!Array.isArray(blocks)) return;

      forEachBlockImageUrl(
        blocks,
        (accessor) => {
          visit({
            get: accessor.get,
            set: (url) => {
              accessor.set(url);
              // Keep the serialized __EVBLOCKS__ paragraph in sync with mutated blocks.
              article.paragraphs[pi] = EVBLOCKS_PREFIX + JSON.stringify(blocks);
            },
            location: `paragraphs[${pi}].${accessor.location.replace(/^blocks\./, '')}`
          });
        },
        'blocks'
      );
    });
  }
}

/**
 * Non-mutating scan of one article's image URLs.
 * @returns {{ base64: number, cdn: number, httpOther: number, empty: number, locations: string[], hasImageBlocks: boolean }}
 */
function scanArticleImages(article) {
  const clone = structuredCloneArticle(article);
  const stats = {
    base64: 0,
    cdn: 0,
    httpOther: 0,
    empty: 0,
    locations: [],
    hasImageBlocks: articleHasImageBlocks(article)
  };

  forEachArticleImageUrl(clone, ({ get, location }) => {
    const url = get();
    if (!url || !String(url).trim()) {
      stats.empty++;
      return;
    }
    if (shouldMigrateImageUrl(url)) {
      stats.base64++;
      stats.locations.push(location);
    } else if (isCloudinaryUrl(url) || isHttpImageUrl(url)) {
      stats.cdn++;
    } else {
      stats.httpOther++;
    }
  });

  return stats;
}

function articleHasImageBlocks(article) {
  const check = (blocks) =>
    Array.isArray(blocks) &&
    blocks.some((b) => b && (b.type === 'image' || b.type === 'gallery' || b.type === 'comparison'));

  if (check(article?.blocks)) return true;
  const paragraphs = Array.isArray(article?.paragraphs) ? article.paragraphs : [];
  for (const p of paragraphs) {
    if (typeof p !== 'string' || !p.startsWith(EVBLOCKS_PREFIX)) continue;
    try {
      if (check(JSON.parse(p.slice(EVBLOCKS_PREFIX.length)))) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

/** Deep-enough clone for migration (JSON round-trip; articles are JSON-safe). */
function structuredCloneArticle(article) {
  return JSON.parse(JSON.stringify(article));
}

/**
 * Replace Base64 image URLs on a cloned article via async uploader.
 * Idempotent: http(s) / Cloudinary URLs are never uploaded or overwritten.
 *
 * @param {object} article
 * @param {{ uploadDataUrl: (dataUrl: string, location: string) => Promise<{ url: string, public_id?: string }> }} deps
 * @returns {Promise<{ article: object, changed: boolean, uploaded: number, skippedCdn: number, replaced: Array<{ location: string, url: string }> }>}
 */
async function migrateArticleBase64Images(article, { uploadDataUrl }) {
  const next = structuredCloneArticle(article);
  let uploaded = 0;
  let skippedCdn = 0;
  const replaced = [];
  const uploadCache = new Map();

  const accessors = [];
  forEachArticleImageUrl(next, (accessor) => {
    accessors.push(accessor);
  });

  for (const { get, set, location } of accessors) {
    const url = get();
    if (!url || !String(url).trim()) continue;

    if (!shouldMigrateImageUrl(url)) {
      if (isCloudinaryUrl(url) || isHttpImageUrl(url)) skippedCdn++;
      continue;
    }

    let uploadedMeta;
    if (uploadCache.has(url)) {
      uploadedMeta = uploadCache.get(url);
    } else {
      uploadedMeta = await uploadDataUrl(url, location);
      if (!uploadedMeta || !uploadedMeta.url || !isHttpImageUrl(uploadedMeta.url)) {
        throw new Error(`Upload did not return an http(s) URL for ${location}`);
      }
      uploadCache.set(url, uploadedMeta);
      uploaded++;
    }

    set(uploadedMeta.url);
    replaced.push({ location, url: uploadedMeta.url });

    // Keep legacy cloudinaryImage mirror in sync when cover was migrated.
    if (location === 'imageUrl' && uploadedMeta.public_id) {
      if (!next.cloudinaryImage || typeof next.cloudinaryImage !== 'object') {
        next.cloudinaryImage = { url: '', public_id: '' };
      }
      // Only set if previous value was empty or was itself Base64.
      if (!next.cloudinaryImage.url || shouldMigrateImageUrl(next.cloudinaryImage.url)) {
        next.cloudinaryImage.url = uploadedMeta.url;
        next.cloudinaryImage.public_id = uploadedMeta.public_id;
      }
    }
  }

  return {
    article: next,
    changed: replaced.length > 0,
    uploaded,
    skippedCdn,
    replaced
  };
}

module.exports = {
  isDataImageUrl,
  isHttpImageUrl,
  isCloudinaryUrl,
  shouldMigrateImageUrl,
  dataUrlToBuffer,
  forEachBlockImageUrl,
  forEachArticleImageUrl,
  scanArticleImages,
  articleHasImageBlocks,
  structuredCloneArticle,
  migrateArticleBase64Images,
  EVBLOCKS_PREFIX
};
