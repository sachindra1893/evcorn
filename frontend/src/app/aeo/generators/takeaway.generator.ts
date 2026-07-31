import { AeoArticleContext, AeoBlockLike, AeoVehicleLike, VehicleOverviewFacts } from '../aeo.types';
import { buildVehicleOverviewFacts, isUsableSpec } from '../vehicle-facts';

const MAX_TAKEAWAYS = 5;

/**
 * Vehicle Key Takeaways — keyHighlights split + up to 3 fact bullets. Cap 5.
 */
export function generateVehicleTakeaways(
  selectedVariant: AeoVehicleLike | null | undefined,
  variants: AeoVehicleLike[] = [],
  facts?: VehicleOverviewFacts
): string[] {
  const out: string[] = [];
  const highlights = splitHighlights(selectedVariant?.keyHighlights);
  for (const h of highlights) {
    if (out.length >= MAX_TAKEAWAYS) break;
    out.push(h);
  }

  const overview = facts || buildVehicleOverviewFacts(variants.length ? variants : selectedVariant ? [selectedVariant] : []);
  const factBullets: string[] = [];
  if (isUsableSpec(overview.claimedRange)) {
    factBullets.push(`Claimed range: ${overview.claimedRange}`);
  }
  if (isUsableSpec(overview.priceRange) && overview.priceRange !== 'TBA') {
    factBullets.push(`Price: ${overview.priceRange}`);
  }
  if (isUsableSpec(overview.batteryOptions)) {
    factBullets.push(`Battery options: ${overview.batteryOptions}`);
  }
  if (isUsableSpec(overview.charging) && factBullets.length < 3) {
    factBullets.push(`DC charging: ${overview.charging}`);
  }
  if (isUsableSpec(selectedVariant?.bodyStyle) && factBullets.length < 3) {
    factBullets.push(`Body style: ${selectedVariant!.bodyStyle}`);
  }
  if (isUsableSpec(selectedVariant?.safetyRating) && factBullets.length < 3) {
    factBullets.push(`Safety: ${selectedVariant!.safetyRating}`);
  }

  for (const bullet of factBullets.slice(0, 3)) {
    if (out.length >= MAX_TAKEAWAYS) break;
    if (!out.some((existing) => existing.toLowerCase() === bullet.toLowerCase())) {
      out.push(bullet);
    }
  }

  return out.slice(0, MAX_TAKEAWAYS);
}

/**
 * Article Key Takeaways — list block items || callout texts || heading leads. Cap 5.
 */
export function generateArticleTakeaways(ctx: AeoArticleContext): string[] {
  const blocks = ctx.blocks || [];
  const fromList = listItemsFromBlocks(blocks);
  if (fromList.length) return fromList.slice(0, MAX_TAKEAWAYS);

  const fromCallouts = calloutsFromBlocks(blocks);
  if (fromCallouts.length) return fromCallouts.slice(0, MAX_TAKEAWAYS);

  const fromHeadings = headingLeadsFromBlocks(blocks);
  return fromHeadings.slice(0, MAX_TAKEAWAYS);
}

function splitHighlights(raw: string | undefined): string[] {
  if (!raw || !isUsableSpec(raw)) return [];
  return raw
    .split(/[;,\n•]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && isUsableSpec(s));
}

function listItemsFromBlocks(blocks: AeoBlockLike[]): string[] {
  const items: string[] = [];
  for (const block of blocks) {
    if (block.type !== 'list') continue;
    const raw = block.data?.['items'];
    if (!Array.isArray(raw)) continue;
    for (const item of raw) {
      if (typeof item === 'string' && item.trim()) items.push(stripHtml(item.trim()));
    }
  }
  return items;
}

function calloutsFromBlocks(blocks: AeoBlockLike[]): string[] {
  const items: string[] = [];
  for (const block of blocks) {
    if (block.type !== 'callout' && block.type !== 'quote') continue;
    const text = block.data?.['text'];
    if (typeof text === 'string' && text.trim()) items.push(stripHtml(text.trim()));
  }
  return items;
}

function headingLeadsFromBlocks(blocks: AeoBlockLike[]): string[] {
  const items: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type !== 'heading') continue;
    const heading = typeof block.data?.['text'] === 'string' ? stripHtml(block.data['text']).trim() : '';
    if (!heading) continue;
    const next = blocks[i + 1];
    if (next?.type === 'paragraph' && typeof next.data?.['text'] === 'string') {
      const lead = stripHtml(next.data['text']).trim();
      if (lead) {
        const sentence = lead.split(/(?<=[.!?])\s+/)[0] || lead;
        items.push(`${heading}: ${truncate(sentence, 160)}`);
        continue;
      }
    }
    items.push(heading);
  }
  return items;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const sliced = text.slice(0, max);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}
