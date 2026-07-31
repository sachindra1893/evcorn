import { AeoArticleContext, AeoBlockLike } from '../aeo.types';

/** Words per minute — architecture ≈220; article page historically used 200. Prefer 220 for AEO. */
export const AEO_WORDS_PER_MINUTE = 220;

/**
 * Reading time from article body (blocks + paragraphs).
 * Returns undefined when there is effectively no body (< 1 min optional hide → still return 1 if any words).
 */
export function generateReadingTimeMinutes(ctx: AeoArticleContext): number | undefined {
  const words = countArticleWords(ctx);
  if (words <= 0) return undefined;
  const mins = Math.ceil(words / AEO_WORDS_PER_MINUTE);
  return mins < 1 ? 1 : mins;
}

export function countArticleWords(ctx: AeoArticleContext): number {
  let wordCount = 0;
  if (ctx.blocks?.length) {
    wordCount += countBlockWords(ctx.blocks);
  } else if (ctx.paragraphs?.length) {
    for (const p of ctx.paragraphs) {
      if (typeof p !== 'string' || p.startsWith('__EVBLOCKS__')) continue;
      wordCount += countWords(stripHtml(p));
    }
  }
  return wordCount;
}

function countBlockWords(blocks: AeoBlockLike[]): number {
  let wordCount = 0;
  for (const block of blocks) {
    const data = block.data || {};
    switch (block.type) {
      case 'paragraph':
      case 'heading':
      case 'quote':
      case 'callout':
        if (typeof data['text'] === 'string') wordCount += countWords(stripHtml(data['text']));
        break;
      case 'list':
        if (Array.isArray(data['items'])) {
          for (const item of data['items']) {
            if (typeof item === 'string') wordCount += countWords(stripHtml(item));
          }
        }
        break;
      case 'faq':
        if (Array.isArray(data['items'])) {
          for (const item of data['items'] as Array<{ question?: string; answer?: string }>) {
            if (item?.question) wordCount += countWords(stripHtml(item.question));
            if (item?.answer) wordCount += countWords(stripHtml(item.answer));
          }
        }
        break;
      case 'pros-cons':
        if (Array.isArray(data['pros'])) {
          for (const p of data['pros']) {
            if (typeof p === 'string') wordCount += countWords(stripHtml(p));
          }
        }
        if (Array.isArray(data['cons'])) {
          for (const c of data['cons']) {
            if (typeof c === 'string') wordCount += countWords(stripHtml(c));
          }
        }
        break;
      default:
        break;
    }
  }
  return wordCount;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
