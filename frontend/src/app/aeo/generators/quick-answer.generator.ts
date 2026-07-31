import {
  AeoArticleContext,
  AeoBlockLike,
  AeoVehicleContext,
  VehicleOverviewFacts
} from '../aeo.types';
import { buildVehicleOverviewFacts, isUsableSpec } from '../vehicle-facts';

/**
 * Vehicle Quick Answer — one citation-ready sentence from overview facts.
 * Prefer existing seo.metaDescription when present (schema field, not a new AEO CMS field).
 */
export function generateVehicleQuickAnswer(
  ctx: Pick<AeoVehicleContext, 'brandName' | 'modelName' | 'variants' | 'selectedVariant' | 'seoMetaDescription'>,
  facts?: VehicleOverviewFacts
): string | undefined {
  const override =
    ctx.seoMetaDescription?.trim() ||
    ctx.selectedVariant?.seo?.metaDescription?.trim();
  if (override) return override;

  const overview = facts || buildVehicleOverviewFacts(ctx.variants || []);
  const brand = (ctx.brandName || '').trim();
  const model = (ctx.modelName || '').trim();
  if (!brand || !model) return undefined;

  const parts: string[] = [];
  if (isUsableSpec(overview.priceRange) && overview.priceRange !== 'TBA') {
    parts.push(`priced from ${overview.priceRange}`);
  }
  if (isUsableSpec(overview.batteryOptions)) {
    parts.push(`batteries ${overview.batteryOptions}`);
  }
  if (isUsableSpec(overview.claimedRange)) {
    parts.push(`claimed range ${overview.claimedRange}`);
  }
  if (isUsableSpec(overview.charging)) {
    parts.push(`DC charging ${overview.charging}`);
  }

  if (parts.length === 0) {
    return `The ${brand} ${model} is an electric vehicle listed on EVCorn.`;
  }

  return `The ${brand} ${model} EV in India is ${parts.join(', ')}.`;
}

/**
 * Article Quick Answer — seo.metaDescription || description || first paragraph text.
 */
export function generateArticleQuickAnswer(ctx: AeoArticleContext): string | undefined {
  const fromSeo = ctx.seoMetaDescription?.trim();
  if (fromSeo) return fromSeo;

  const fromDesc = ctx.description?.trim();
  if (fromDesc) return fromDesc;

  const fromBlock = firstParagraphFromBlocks(ctx.blocks);
  if (fromBlock) return truncateSentence(fromBlock, 280);

  const fromParagraphs = ctx.paragraphs?.find(
    (p) => typeof p === 'string' && p.trim() && !p.startsWith('__EVBLOCKS__')
  );
  if (fromParagraphs) return truncateSentence(stripHtml(fromParagraphs), 280);

  return undefined;
}

function firstParagraphFromBlocks(blocks: AeoBlockLike[] | undefined): string | undefined {
  if (!blocks?.length) return undefined;
  for (const block of blocks) {
    if (block.type === 'paragraph' && typeof block.data?.['text'] === 'string') {
      const text = stripHtml(block.data['text']).trim();
      if (text) return text;
    }
  }
  return undefined;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncateSentence(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const sliced = clean.slice(0, max);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}
