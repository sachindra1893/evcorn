const {
  isDataImageUrl,
  isHttpImageUrl,
  isCloudinaryUrl,
  shouldMigrateImageUrl,
  dataUrlToBuffer,
  scanArticleImages,
  articleHasImageBlocks,
  migrateArticleBase64Images,
  forEachArticleImageUrl,
  EVBLOCKS_PREFIX
} = require('../../utils/articleBase64Migrate');

const TINY_JPEG =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

const CDN = 'https://res.cloudinary.com/demo/image/upload/v1/cover.webp';
const OTHER_HTTP = 'https://images.unsplash.com/photo-123';

describe('articleBase64Migrate helpers', () => {
  it('detects Base64 data:image and leaves CDN/http alone', () => {
    expect(isDataImageUrl(TINY_JPEG)).toBe(true);
    expect(shouldMigrateImageUrl(TINY_JPEG)).toBe(true);
    expect(shouldMigrateImageUrl(CDN)).toBe(false);
    expect(shouldMigrateImageUrl(OTHER_HTTP)).toBe(false);
    expect(isCloudinaryUrl(CDN)).toBe(true);
    expect(isHttpImageUrl(OTHER_HTTP)).toBe(true);
    expect(isDataImageUrl(CDN)).toBe(false);
  });

  it('decodes data URLs to buffers', () => {
    const { buffer, mime, ext } = dataUrlToBuffer(TINY_JPEG);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(10);
    expect(mime).toContain('jpeg');
    expect(ext).toBe('jpg');
  });

  it('scans cover + __EVBLOCKS__ image/gallery/comparison fields', () => {
    const article = {
      imageUrl: TINY_JPEG,
      paragraphs: [
        `${EVBLOCKS_PREFIX}${JSON.stringify([
          { type: 'paragraph', id: 'p1', data: { text: 'hi' } },
          { type: 'image', id: 'i1', data: { url: TINY_JPEG, caption: 'c' } },
          {
            type: 'gallery',
            id: 'g1',
            data: { images: [{ url: CDN }, { url: TINY_JPEG }] }
          },
          {
            type: 'comparison',
            id: 'c1',
            data: { items: [{ title: 'A', image: OTHER_HTTP }, { title: 'B', image: TINY_JPEG }] }
          }
        ])}`
      ]
    };

    expect(articleHasImageBlocks(article)).toBe(true);
    const scan = scanArticleImages(article);
    expect(scan.base64).toBe(4); // cover + image + gallery[1] + comparison[1]
    expect(scan.cdn).toBe(2); // gallery CDN + comparison http
    expect(scan.locations).toEqual(
      expect.arrayContaining([
        'imageUrl',
        expect.stringContaining('image'),
        expect.stringContaining('gallery'),
        expect.stringContaining('comparison')
      ])
    );
  });

  it('replaces Base64 with CDN via uploader and does not re-upload CDN URLs', async () => {
    const article = {
      id: 'a1',
      slug: 'keep-me',
      status: 'published',
      seo: { metaTitle: 'SEO' },
      createdAt: '2026-01-01T00:00:00.000Z',
      imageUrl: TINY_JPEG,
      paragraphs: [
        `${EVBLOCKS_PREFIX}${JSON.stringify([
          { type: 'image', id: 'i1', data: { url: CDN } },
          { type: 'image', id: 'i2', data: { url: TINY_JPEG } },
          { type: 'image', id: 'i3', data: { url: TINY_JPEG } }
        ])}`
      ]
    };

    let uploadCalls = 0;
    const result = await migrateArticleBase64Images(article, {
      uploadDataUrl: async () => {
        uploadCalls++;
        return {
          url: 'https://res.cloudinary.com/demo/image/upload/v1/migrated.webp',
          public_id: 'evcorn/articles/migrated/x'
        };
      }
    });

    expect(result.changed).toBe(true);
    expect(uploadCalls).toBe(1); // identical data URL deduped
    expect(result.uploaded).toBe(1);
    expect(result.article.imageUrl).toContain('res.cloudinary.com');
    expect(result.article.slug).toBe('keep-me');
    expect(result.article.status).toBe('published');
    expect(result.article.seo.metaTitle).toBe('SEO');
    expect(result.article.createdAt).toBe('2026-01-01T00:00:00.000Z');

    const body = JSON.parse(result.article.paragraphs[0].slice(EVBLOCKS_PREFIX.length));
    expect(body[0].data.url).toBe(CDN); // untouched
    expect(body[1].data.url).toContain('res.cloudinary.com');
    expect(body[2].data.url).toBe(body[1].data.url);

    // Idempotent second pass
    const again = await migrateArticleBase64Images(result.article, {
      uploadDataUrl: async () => {
        throw new Error('should not upload');
      }
    });
    expect(again.changed).toBe(false);
    expect(again.uploaded).toBe(0);
  });

  it('forEachArticleImageUrl visits media / author mirrors', () => {
    const article = {
      imageUrl: CDN,
      media: { url: TINY_JPEG, mainImage: '' },
      author: { imageUrl: TINY_JPEG },
      cloudinaryImage: { url: CDN }
    };
    const seen = [];
    forEachArticleImageUrl(article, ({ get, location }) => {
      if (shouldMigrateImageUrl(get())) seen.push(location);
    });
    expect(seen).toEqual(expect.arrayContaining(['media.url', 'author.imageUrl']));
    expect(seen).not.toContain('imageUrl');
  });
});
