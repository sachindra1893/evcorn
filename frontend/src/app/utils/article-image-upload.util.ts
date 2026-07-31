import { ArticleBlock } from '../models/blocks.model';

/** True for inline image data URLs that must never be persisted to Mongo. */
export function isDataImageUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\//i.test(value.trim());
}

/** Temporary browser object URLs — local preview only, never persist. */
export function isBlobUrl(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toLowerCase().startsWith('blob:');
}

export function isLocalPreviewImageUrl(value: unknown): boolean {
  return isDataImageUrl(value) || isBlobUrl(value);
}

type UrlAccessor = {
  get: () => string;
  set: (url: string) => void;
};

/**
 * Visit every article image URL field (cover handled separately).
 * Covers image blocks, gallery slides, and comparison card images.
 */
export function forEachArticleImageUrl(
  blocks: ArticleBlock[] | null | undefined,
  visit: (accessor: UrlAccessor) => void
): void {
  if (!blocks || !Array.isArray(blocks)) return;

  for (const block of blocks) {
    if (!block || !block.data) continue;

    if (block.type === 'image') {
      const data = block.data as { url?: string };
      visit({
        get: () => data.url || '',
        set: (url) => {
          data.url = url;
        }
      });
    } else if (block.type === 'gallery') {
      const images = (block.data as { images?: Array<{ url?: string }> }).images || [];
      for (const img of images) {
        visit({
          get: () => img.url || '',
          set: (url) => {
            img.url = url;
          }
        });
      }
    } else if (block.type === 'comparison') {
      const items = (block.data as { items?: Array<{ image?: string }> }).items || [];
      for (const card of items) {
        visit({
          get: () => card.image || '',
          set: (url) => {
            card.image = url;
          }
        });
      }
    }
  }
}

/** Convert a data:image URL into a File for the shared Cloudinary upload API. */
export function dataUrlToFile(dataUrl: string, filename = 'article-image.jpg'): File {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) {
    throw new Error('Invalid data URL');
  }
  const header = dataUrl.slice(0, comma);
  const data = dataUrl.slice(comma + 1);
  const mime = /data:([^;]+)/i.exec(header)?.[1] || 'image/jpeg';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const ext = mime.split('/')[1]?.split('+')[0] || 'jpg';
  const safeName = filename.includes('.') ? filename : `${filename}.${ext}`;
  return new File([bytes], safeName, { type: mime });
}

export function articleHasUploadingImages(
  blocks: ArticleBlock[] | null | undefined,
  coverProcessing = false
): boolean {
  if (coverProcessing) return true;
  if (!blocks) return false;
  return blocks.some((b) => Boolean((b as { _uploading?: boolean })._uploading))
    || blocks.some((b) => {
      if (b.type !== 'gallery') return false;
      const images = (b.data as { images?: Array<{ _uploading?: boolean }> }).images || [];
      return images.some((img) => Boolean(img._uploading));
    });
}

/**
 * Upload every remaining data:image URL in blocks via the shared upload pipeline.
 * Mutates a deep clone and returns it. Blob URLs cannot be converted here.
 */
export async function uploadDataImagesInBlocks(
  blocks: ArticleBlock[],
  upload: (file: File) => Promise<{ url: string }>
): Promise<ArticleBlock[]> {
  const cloned: ArticleBlock[] = JSON.parse(JSON.stringify(blocks || []));
  const jobs: Promise<void>[] = [];

  forEachArticleImageUrl(cloned, ({ get, set }) => {
    const url = get();
    if (!isDataImageUrl(url)) return;
    jobs.push(
      upload(dataUrlToFile(url)).then((res) => {
        if (!res?.url || isLocalPreviewImageUrl(res.url)) {
          throw new Error('Upload did not return a CDN URL');
        }
        set(res.url);
      })
    );
  });

  await Promise.all(jobs);
  return cloned;
}

/** Ensure cover imageUrl is a CDN URL (upload if still a data URL). */
export async function uploadCoverIfDataUrl(
  imageUrl: string,
  upload: (file: File) => Promise<{ url: string }>
): Promise<string> {
  const trimmed = (imageUrl || '').trim();
  if (!isDataImageUrl(trimmed)) {
    return trimmed;
  }
  const res = await upload(dataUrlToFile(trimmed, 'article-cover.jpg'));
  if (!res?.url || isLocalPreviewImageUrl(res.url)) {
    throw new Error('Cover upload did not return a CDN URL');
  }
  return res.url;
}

/**
 * Final guard before serialize/save: no data:image or blob: URLs remain.
 * Returns an error message, or null when safe to persist.
 */
export function assertNoLocalPreviewImages(
  blocks: ArticleBlock[] | null | undefined,
  coverUrl = ''
): string | null {
  if (isLocalPreviewImageUrl(coverUrl)) {
    return 'Cover image is still a local preview. Wait for Cloudinary upload to finish, then save again.';
  }

  let found = false;
  forEachArticleImageUrl(blocks, ({ get }) => {
    if (isLocalPreviewImageUrl(get())) {
      found = true;
    }
  });

  if (found) {
    return 'An article image is still a local preview (Base64/blob). Upload to Cloudinary before saving.';
  }
  return null;
}
