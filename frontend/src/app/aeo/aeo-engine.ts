import { aeoRelatedFromGraph } from '../entity/entity-graph';
import { getCachedAeo, setCachedAeo } from './aeo-cache';
import {
  AeoArticleContext,
  AeoPageModel,
  AeoVehicleContext,
  emptyAeoPageModel
} from './aeo.types';
import { generateBuyingRecommendation } from './generators/buying-recommendation.generator';
import { generateCtas } from './generators/cta.generator';
import { generateArticleFaqs, generateVehicleFaqs } from './generators/faq.generator';
import { generateInternalLinks } from './generators/internal-link.generator';
import { resolveLastUpdated, resolveLastUpdatedFromVariants } from './generators/last-updated';
import {
  generateArticleQuickAnswer,
  generateVehicleQuickAnswer
} from './generators/quick-answer.generator';
import { generateReadingTimeMinutes } from './generators/reading-time.generator';
import { generateRelatedArticles } from './generators/related-article.generator';
import { generateRelatedComparisons } from './generators/related-comparison.generator';
import { generateRelatedVehicles } from './generators/related-vehicle.generator';
import { generateSpecSummary } from './generators/spec-summary.generator';
import {
  generateArticleTakeaways,
  generateVehicleTakeaways
} from './generators/takeaway.generator';
import { generateArticleToc, generateVehicleToc } from './generators/toc.generator';
import { generateTrust } from './generators/trust.generator';
import { buildVehicleOverviewFacts } from './vehicle-facts';

/**
 * Lightweight FE gate for AEO answer chrome.
 * Removable without touching Phase 7.1 SEO paths.
 */
export const AEO_ANSWER_BLOCKS_ENABLED = true;

function safeRun<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function cacheStamp(entityId: string, updatedAt: string | undefined): { id: string; at: string } {
  return { id: entityId, at: updatedAt || 'unknown' };
}

function cloneModel(model: AeoPageModel): AeoPageModel {
  return {
    ...model,
    keyTakeaways: [...model.keyTakeaways],
    toc: model.toc.map((t) => ({ ...t })),
    pros: [...model.pros],
    cons: [...model.cons],
    specSummary: model.specSummary.map((s) => ({ ...s })),
    relatedVehicles: model.relatedVehicles.map((v) => ({ ...v })),
    relatedComparisons: model.relatedComparisons.map((c) => ({ ...c })),
    relatedArticles: model.relatedArticles.map((a) => ({ ...a })),
    internalLinks: model.internalLinks.map((l) => ({ ...l })),
    faqs: model.faqs.map((f) => ({ ...f })),
    trust: model.trust ? { ...model.trust } : undefined,
    ctas: { ...model.ctas }
  };
}

/**
 * Related / comparison / internal-link sections depend on async wire inputs.
 * Re-apply them on every build so cache hits (entityId+updatedAt) stay correct.
 * Prefer Entity Graph edges (hrefs via entity-href). On empty/throw → DTO generators.
 */
function applyVehicleRelatedSections(model: AeoPageModel, ctx: AeoVehicleContext): void {
  const fromGraph = safeRun(
    () =>
      aeoRelatedFromGraph(ctx.entityGraph, {
        selectedVariantId: ctx.selectedVariant?.id,
        labelLeft: [ctx.brandName, ctx.modelName].filter(Boolean).join(' ') || undefined
      }),
    null
  );

  if (fromGraph) {
    model.relatedVehicles = fromGraph.relatedVehicles;
    model.relatedArticles = fromGraph.relatedArticles;
    model.relatedComparisons = fromGraph.relatedComparisons;
  } else {
    model.relatedVehicles = safeRun(
      () =>
        generateRelatedVehicles(ctx.relatedVehicles, {
          excludeId: ctx.selectedVariant?.id,
          excludeBrandSlug: ctx.brandSlug,
          excludeModelSlug: ctx.modelSlug
        }),
      []
    );
    model.relatedArticles = safeRun(
      () => generateRelatedArticles(ctx.relatedArticles),
      []
    );
    model.relatedComparisons = safeRun(
      () =>
        generateRelatedComparisons(ctx.selectedVariant, ctx.relatedVehicles || model.relatedVehicles, {
          brandName: ctx.brandName,
          modelName: ctx.modelName
        }),
      []
    );
  }

  // Core hub links only — Related* sections own vehicle/article deep-links (no dup UI).
  // Paths via entity-href SSOT inside the generator.
  model.internalLinks = safeRun(
    () =>
      generateInternalLinks({
        brandName: ctx.brandName,
        brandSlug: ctx.brandSlug,
        modelName: ctx.modelName,
        modelSlug: ctx.modelSlug,
        selectedVariantId: ctx.selectedVariant?.id,
        includeModelOverview: false,
        includeFaqs: true
      }),
    []
  );
}

function applyArticleRelatedSections(model: AeoPageModel, ctx: AeoArticleContext): void {
  const fromGraph = safeRun(() => aeoRelatedFromGraph(ctx.entityGraph), null);

  if (fromGraph) {
    model.relatedVehicles = fromGraph.relatedVehicles;
    model.relatedArticles = fromGraph.relatedArticles.filter((a) => a.id !== ctx.id);
    // Preserve Phase 7.2 article compare deep-links from the related vehicle slate.
    model.relatedComparisons = safeRun(
      () => generateRelatedComparisons(undefined, model.relatedVehicles),
      []
    );
  } else {
    model.relatedVehicles = safeRun(
      () => generateRelatedVehicles(ctx.relatedVehicles),
      []
    );
    model.relatedArticles = safeRun(
      () => generateRelatedArticles(ctx.relatedArticles, { excludeId: ctx.id }),
      []
    );
    model.relatedComparisons = safeRun(
      () => generateRelatedComparisons(undefined, ctx.relatedVehicles),
      []
    );
  }

  model.internalLinks = safeRun(
    () =>
      generateInternalLinks({
        brandSlug: ctx.brandSlug,
        modelSlug: ctx.modelSlug,
        includeFaqs: true,
        includeEnergy: true
      }),
    []
  );
}

/**
 * Build vehicle AEO model from page-local context only.
 * Generator failures skip that section; never throw to the page.
 */
export function buildVehicleAeo(ctx: AeoVehicleContext): AeoPageModel {
  const entityId =
    ctx.selectedVariant?.id ||
    `${ctx.brandSlug}/${ctx.modelSlug}` ||
    'vehicle';
  const updatedAt = resolveLastUpdatedFromVariants(ctx.variants) || resolveLastUpdated(ctx.selectedVariant);
  const stamp = cacheStamp(entityId, updatedAt);

  const cached = getCachedAeo(stamp.id, stamp.at);
  if (cached) {
    const model = cloneModel(cached);
    applyVehicleRelatedSections(model, ctx);
    return model;
  }

  const model = emptyAeoPageModel();
  const facts = safeRun(() => buildVehicleOverviewFacts(ctx.variants), {
    priceRange: 'TBA',
    batteryOptions: 'N/A',
    claimedRange: 'N/A',
    charging: 'N/A'
  });

  model.quickAnswer = safeRun(() => generateVehicleQuickAnswer(ctx, facts), undefined);
  model.keyTakeaways = safeRun(
    () => generateVehicleTakeaways(ctx.selectedVariant, ctx.variants, facts),
    []
  );
  model.specSummary = safeRun(() => generateSpecSummary(ctx.selectedVariant), []);
  model.toc = safeRun(() => generateVehicleToc(), []);
  model.lastUpdated = updatedAt;
  model.buyingRecommendation = safeRun(
    () => generateBuyingRecommendation(ctx.brandName, ctx.modelName, ctx.selectedVariant, facts),
    undefined
  );
  model.faqs = safeRun(() => generateVehicleFaqs(ctx, facts), []);
  model.trust = safeRun(
    () =>
      generateTrust({
        kind: 'vehicle',
        brandName: ctx.brandName,
        lastUpdated: updatedAt
      }),
    undefined
  );
  model.ctas = safeRun(
    () =>
      generateCtas({
        selectedVariantId: ctx.selectedVariant?.id,
        brandSlug: ctx.brandSlug,
        modelSlug: ctx.modelSlug,
        preferSpecsAnchor: true
      }),
    {}
  );

  applyVehicleRelatedSections(model, ctx);

  // Cache core model without depending on async related slate stability.
  const toCache = cloneModel(model);
  toCache.relatedVehicles = [];
  toCache.relatedArticles = [];
  toCache.relatedComparisons = [];
  toCache.internalLinks = safeRun(
    () =>
      generateInternalLinks({
        brandName: ctx.brandName,
        brandSlug: ctx.brandSlug,
        modelName: ctx.modelName,
        modelSlug: ctx.modelSlug,
        selectedVariantId: ctx.selectedVariant?.id,
        includeModelOverview: false,
        includeFaqs: true
      }),
    []
  );
  setCachedAeo(stamp.id, stamp.at, toCache);
  return model;
}

/**
 * Build article AEO model from page-local article + optional related DTOs.
 */
export function buildArticleAeo(ctx: AeoArticleContext): AeoPageModel {
  const entityId = ctx.id || 'article';
  const updatedAt = resolveLastUpdated(ctx);
  const stamp = cacheStamp(entityId, updatedAt);

  const cached = getCachedAeo(stamp.id, stamp.at);
  if (cached) {
    const model = cloneModel(cached);
    applyArticleRelatedSections(model, ctx);
    return model;
  }

  const model = emptyAeoPageModel();

  model.quickAnswer = safeRun(() => generateArticleQuickAnswer(ctx), undefined);
  model.keyTakeaways = safeRun(() => generateArticleTakeaways(ctx), []);
  model.readingTimeMinutes = safeRun(() => generateReadingTimeMinutes(ctx), undefined);
  model.toc = safeRun(() => generateArticleToc(ctx), []);
  model.lastUpdated = updatedAt;
  model.faqs = safeRun(() => generateArticleFaqs(ctx), []);
  model.trust = safeRun(
    () =>
      generateTrust({
        kind: 'article',
        author: ctx.author,
        lastUpdated: updatedAt
      }),
    undefined
  );
  // Articles never use in-page #aeo-specs — link to the vehicle route when slugs exist.
  model.ctas = safeRun(
    () =>
      generateCtas({
        brandSlug: ctx.brandSlug,
        modelSlug: ctx.modelSlug,
        preferSpecsAnchor: false
      }),
    {}
  );

  applyArticleRelatedSections(model, ctx);

  const toCache = cloneModel(model);
  toCache.relatedVehicles = [];
  toCache.relatedArticles = [];
  toCache.relatedComparisons = [];
  toCache.internalLinks = safeRun(
    () =>
      generateInternalLinks({
        brandSlug: ctx.brandSlug,
        modelSlug: ctx.modelSlug,
        includeFaqs: true,
        includeEnergy: true
      }),
    []
  );
  setCachedAeo(stamp.id, stamp.at, toCache);
  return model;
}
