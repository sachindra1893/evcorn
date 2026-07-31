import {
  AeoArticleContext,
  AeoBlockLike,
  AeoFaqItem,
  AeoVehicleContext,
  VehicleOverviewFacts
} from '../aeo.types';
import { isUsableSpec } from '../vehicle-facts';

const MAX_VEHICLE_FAQS = 6;

/**
 * Vehicle templated FAQs from real overview / variant facts only.
 * Empty specs → skip that Q&A. Cap ≤6.
 */
export function generateVehicleFaqs(
  ctx: Pick<AeoVehicleContext, 'brandName' | 'modelName' | 'selectedVariant'>,
  facts: VehicleOverviewFacts
): AeoFaqItem[] {
  const brand = (ctx.brandName || '').trim();
  const model = (ctx.modelName || '').trim();
  if (!brand || !model) return [];

  const faqs: AeoFaqItem[] = [];
  const push = (question: string, answer: string | undefined) => {
    if (!answer || !isUsableSpec(answer) || faqs.length >= MAX_VEHICLE_FAQS) return;
    faqs.push({ question, answer: String(answer).trim() });
  };

  if (isUsableSpec(facts.priceRange) && facts.priceRange !== 'TBA') {
    push(
      `What is the price of the ${brand} ${model} in India?`,
      `The ${brand} ${model} is listed from ${facts.priceRange} (ex-showroom figures as published on EVCorn).`
    );
  }
  if (isUsableSpec(facts.claimedRange)) {
    push(
      `What is the claimed range of the ${brand} ${model}?`,
      `Claimed range for the ${brand} ${model} is ${facts.claimedRange}, based on published variant specs.`
    );
  }
  if (isUsableSpec(facts.batteryOptions)) {
    push(
      `What battery options does the ${brand} ${model} offer?`,
      `Published battery options: ${facts.batteryOptions}.`
    );
  }
  if (isUsableSpec(facts.charging)) {
    push(
      `How fast does the ${brand} ${model} DC fast charge?`,
      `DC fast charging is listed at ${facts.charging}.`
    );
  }

  const seating = ctx.selectedVariant?.seating;
  if (isUsableSpec(seating)) {
    push(`How many seats does the ${brand} ${model} have?`, `${seating}.`);
  }

  const body = ctx.selectedVariant?.bodyStyle;
  if (isUsableSpec(body)) {
    push(`What body style is the ${brand} ${model}?`, `It is listed as a ${body}.`);
  }

  return faqs;
}

/**
 * Article FAQs from editorial `faq` blocks only — never invent Q&As.
 */
export function generateArticleFaqs(ctx: Pick<AeoArticleContext, 'blocks'>): AeoFaqItem[] {
  return extractFaqItemsFromBlocks(ctx.blocks);
}

export function extractFaqItemsFromBlocks(
  blocks: AeoBlockLike[] | null | undefined
): AeoFaqItem[] {
  if (!blocks?.length) return [];
  const faqs: AeoFaqItem[] = [];
  for (const block of blocks) {
    if (block.type !== 'faq') continue;
    const items = block.data?.['items'];
    if (!Array.isArray(items)) continue;
    for (const item of items as Array<{ question?: string; answer?: string }>) {
      const q = typeof item?.question === 'string' ? item.question.trim() : '';
      const a = typeof item?.answer === 'string' ? stripHtml(item.answer).trim() : '';
      if (q && a) faqs.push({ question: q, answer: a });
    }
  }
  return faqs;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
