import {
  assertNoLocalPreviewImages,
  dataUrlToFile,
  forEachArticleImageUrl,
  isDataImageUrl,
  isLocalPreviewImageUrl,
  uploadCoverIfDataUrl,
  uploadDataImagesInBlocks
} from './article-image-upload.util';
import { ArticleBlock } from '../models/blocks.model';

describe('article-image-upload.util', () => {
  const dataUrl =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEAMQAAAAowD/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAn//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AX//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AX//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/An//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IX//2Q==';

  it('detects data and blob preview URLs', () => {
    expect(isDataImageUrl(dataUrl)).toBe(true);
    expect(isDataImageUrl('https://res.cloudinary.com/x/image/upload/v1/a.webp')).toBe(false);
    expect(isLocalPreviewImageUrl('blob:http://localhost/abc')).toBe(true);
  });

  it('walks image, gallery, and comparison URL fields', () => {
    const blocks: ArticleBlock[] = [
      { type: 'image', id: 'i1', data: { url: 'a' } },
      { type: 'gallery', id: 'g1', data: { columns: 2, images: [{ url: 'b', caption: '', alt: '' }] } },
      {
        type: 'comparison',
        id: 'c1',
        data: { items: [{ title: 'T', image: 'c', specs: [] }] }
      }
    ];
    const seen: string[] = [];
    forEachArticleImageUrl(blocks, ({ get, set }) => {
      seen.push(get());
      set(get() + '-cdn');
    });
    expect(seen).toEqual(['a', 'b', 'c']);
    expect((blocks[0] as any).data.url).toBe('a-cdn');
    expect((blocks[1] as any).data.images[0].url).toBe('b-cdn');
    expect((blocks[2] as any).data.items[0].image).toBe('c-cdn');
  });

  it('converts data URLs to File for the upload API', () => {
    const file = dataUrlToFile(dataUrl, 'block.jpg');
    expect(file).toBeInstanceOf(File);
    expect(file.type).toContain('image/');
    expect(file.size).toBeGreaterThan(0);
  });

  it('uploads data:image in blocks and replaces with CDN URLs', async () => {
    const blocks: ArticleBlock[] = [
      { type: 'image', id: 'i1', data: { url: dataUrl, caption: '', alt: '' } },
      {
        type: 'gallery',
        id: 'g1',
        data: { columns: 2, images: [{ url: dataUrl, caption: '', alt: '' }] }
      }
    ];

    const upload = vi.fn(async () => ({
      url: `https://res.cloudinary.com/demo/image/upload/v1/${Math.random().toString(36).slice(2)}.webp`
    }));

    const next = await uploadDataImagesInBlocks(blocks, upload);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(isDataImageUrl((next[0] as any).data.url)).toBe(false);
    expect((next[0] as any).data.url).toContain('res.cloudinary.com');
    expect((next[1] as any).data.images[0].url).toContain('res.cloudinary.com');
    // Original untouched (clone semantics)
    expect((blocks[0] as any).data.url).toBe(dataUrl);
  });

  it('uploads cover data URL via the same helper', async () => {
    const url = await uploadCoverIfDataUrl(dataUrl, async () => ({
      url: 'https://res.cloudinary.com/demo/image/upload/v1/cover.webp'
    }));
    expect(url).toBe('https://res.cloudinary.com/demo/image/upload/v1/cover.webp');
  });

  it('assertNoLocalPreviewImages blocks save when Base64 remains', () => {
    expect(
      assertNoLocalPreviewImages(
        [{ type: 'image', id: 'i1', data: { url: dataUrl } }],
        'https://res.cloudinary.com/demo/image/upload/v1/cover.webp'
      )
    ).toContain('local preview');

    expect(
      assertNoLocalPreviewImages(
        [{ type: 'image', id: 'i1', data: { url: 'https://res.cloudinary.com/demo/image/upload/v1/a.webp' } }],
        'https://res.cloudinary.com/demo/image/upload/v1/cover.webp'
      )
    ).toBeNull();
  });
});
