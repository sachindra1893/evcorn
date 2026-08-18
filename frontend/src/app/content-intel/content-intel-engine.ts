/**
 * Phase 7.4 M1 — Content Intelligence facade.
 * Pure / derived from page Entity Graph + recommendation slate already on the wire.
 * No HTTP, no DB writes, no CMS changes, no catalog scan.
 * Failure isolation: throw/empty → emptyContentIntelPageModel; callers continue.
 */

import { resolveLastUpdated, resolveLastUpdatedFromVariants } from '../aeo/generators/last-updated';
import { articleEntityId, modelEntityId } from '../entity/entity-id';
import {
  getCachedContentIntel,
  setCachedContentIntel
} from './content-intel-cache';
import {
  ArticleContentIntelContext,
  ContentIntelPageModel,
  VehicleContentIntelContext,
  emptyContentIntelPageModel
} from './content-intel.types';
import { deriveFreshness, deriveVehicleFreshness } from './freshness';
import { suggestContextualLinks, suggestHubLinks } from './link-suggest';
import { deriveClusters, derivePillar } from './pillar-cluster';
import { buildRelatedReadingPlan } from './related-reading';
import { deriveTopicsFromGraph } from './topic-derive';

function safeRun<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function cloneModel(model: ContentIntelPageModel): ContentIntelPageModel {
  return {
    ...model,
    topics: model.topics.map((t) => ({
      ...t,
      topic: { ...t.topic, entityIds: [...t.topic.entityIds] },
      evidenceRefs: [...t.evidenceRefs]
    })),
    pillar: model.pillar ? { ...model.pillar, topicIds: [...model.pillar.topicIds] } : undefined,
    clusters: model.clusters.map((c) => ({
      ...c,
      memberEntityIds: [...c.memberEntityIds],
      memberSuggestions: c.memberSuggestions.map((s) => ({
        ...s,
        evidence: { ...s.evidence, refs: [...s.evidence.refs] }
      }))
    })),
    relatedReading: {
      ...model.relatedReading,
      vehicles: model.relatedReading.vehicles.map((v) => ({
        ...v,
        item: { ...v.item },
        topicLabels: [...v.topicLabels],
        evidence: { ...v.evidence, refs: [...v.evidence.refs] }
      })),
      articles: model.relatedReading.articles.map((a) => ({
        ...a,
        item: { ...a.item },
        topicLabels: [...a.topicLabels],
        evidence: { ...a.evidence, refs: [...a.evidence.refs] }
      })),
      comparisons: model.relatedReading.comparisons.map((c) => ({
        ...c,
        item: { ...c.item },
        evidence: { ...c.evidence, refs: [...c.evidence.refs] }
      }))
    },
    contextualLinks: model.contextualLinks.map((l) => ({
      ...l,
      evidence: { ...l.evidence, refs: [...l.evidence.refs] }
    })),
    hubLinks: model.hubLinks.map((l) => ({
      ...l,
      evidence: { ...l.evidence, refs: [...l.evidence.refs] }
    })),
    freshness: {
      ...model.freshness,
      reasons: [...model.freshness.reasons]
    },
    editorial: model.editorial
      ? {
          ...model.editorial,
          suggestRelatedArticleIds: [...model.editorial.suggestRelatedArticleIds],
          suggestRelatedVehicleIds: [...model.editorial.suggestRelatedVehicleIds],
          suggestRelatedBrandIds: [...model.editorial.suggestRelatedBrandIds],
          suggestInternalLinkTargets: model.editorial.suggestInternalLinkTargets.map((s) => ({
            ...s,
            evidence: { ...s.evidence, refs: [...s.evidence.refs] }
          })),
          missingTopics: [...model.editorial.missingTopics],
          freshness: {
            ...model.editorial.freshness,
            reasons: [...model.editorial.freshness.reasons]
          },
          warnings: [...model.editorial.warnings]
        }
      : undefined,
    evidenceSummary: [...model.evidenceSummary]
  };
}

function buildEvidenceSummary(model: ContentIntelPageModel): string[] {
  const lines: string[] = [];
  for (const t of model.topics) {
    lines.push(`topic:${t.topic.id}|${t.confidence}|${t.evidenceRefs.join(',')}`);
  }
  if (model.pillar) {
    lines.push(`pillar:${model.pillar.id}|${model.pillar.href}`);
  }
  for (const c of model.clusters) {
    lines.push(`cluster:${c.id}|members=${c.memberEntityIds.length}`);
  }
  lines.push(`freshness:${model.freshness.state}|${model.freshness.reasons.join(',')}`);
  lines.push(
    `related:v=${model.relatedReading.vehicles.length},a=${model.relatedReading.articles.length},c=${model.relatedReading.comparisons.length}`
  );
  return lines;
}

function vehicleCacheStamp(ctx: VehicleContentIntelContext): { id: string; version: string } {
  const brandId = (ctx.brand.id || ctx.selectedVariant.categoryId || '').trim();
  const modelId =
    (ctx.modelEntityId || '').trim() ||
    modelEntityId(brandId, ctx.selectedVariant) ||
    (ctx.selectedVariant.id || 'vehicle');
  const datedVariants = (ctx.variants || []).map((v) => ({
    updatedAt: v.updatedAt || undefined
  }));
  const updatedAt =
    resolveLastUpdatedFromVariants(datedVariants) ||
    resolveLastUpdated({ updatedAt: ctx.selectedVariant.updatedAt || undefined }) ||
    'unknown';
  const recFp = [
    ...(ctx.recommendedVehicles || []).map((v) => v.id || ''),
    ...(ctx.recommendedArticles || []).map((a) => a.id || '')
  ].join(',');
  return { id: modelId, version: `${updatedAt}|${recFp}` };
}

function articleCacheStamp(ctx: ArticleContentIntelContext): { id: string; version: string } {
  const id = articleEntityId(ctx.article.id) || (ctx.article.id || 'article');
  const updatedAt =
    resolveLastUpdated({
      updatedAt: ctx.article.updatedAt || undefined,
      publishedAt: ctx.article.publishedAt || undefined,
      publishAt: ctx.article.publishAt || undefined,
      createdAt: ctx.article.createdAt || undefined
    }) || 'unknown';
  const recFp = [
    ...(ctx.recommendedVehicles || []).map((v) => v.id || ''),
    ...(ctx.recommendedArticles || []).map((a) => a.id || '')
  ].join(',');
  return { id, version: `${updatedAt}|${recFp}` };
}

function buildVehicleContentIntelUnsafe(ctx: VehicleContentIntelContext): ContentIntelPageModel {
  const topics = deriveTopicsFromGraph(ctx.entityGraph, {
    pageKind: 'vehicle',
    selectedVariantId: ctx.selectedVariant?.id
  });

  const pillar = derivePillar(topics, {
    pageKind: 'vehicle',
    modelHref: ctx.modelHref
  });

  const clusters = deriveClusters(topics, ctx.entityGraph);

  const relatedReading = buildRelatedReadingPlan(ctx.entityGraph, topics, {
    primaryClusterId: clusters[0]?.id,
    excludeVehicleId: ctx.selectedVariant?.id || undefined
  });

  const hubLinks = suggestHubLinks(topics, {
    pillar,
    excludeModelHref: ctx.modelHref,
    selectedVariantId: ctx.selectedVariant?.id || undefined
  });

  const contextualLinks = suggestContextualLinks(relatedReading, {
    excludeEntityIds: hubLinks.map((h) => h.targetEntityId)
  });

  // Attach capped member suggestions from contextual (related) links onto clusters
  if (clusters.length && contextualLinks.length) {
    clusters[0].memberSuggestions = contextualLinks.slice(0, 4);
  }

  const freshness = deriveVehicleFreshness(ctx.variants, ctx.selectedVariant, ctx.now);

  const model: ContentIntelPageModel = {
    topics,
    pillar,
    clusters,
    relatedReading,
    contextualLinks,
    hubLinks,
    freshness,
    evidenceSummary: []
  };
  model.evidenceSummary = buildEvidenceSummary(model);
  return model;
}

function buildArticleContentIntelUnsafe(ctx: ArticleContentIntelContext): ContentIntelPageModel {
  const topics = deriveTopicsFromGraph(ctx.entityGraph, {
    pageKind: 'article',
    article: ctx.article,
    brands: ctx.brands
  });

  const pillar = derivePillar(topics, { pageKind: 'article' });
  const clusters = deriveClusters(topics, ctx.entityGraph);

  const relatedReading = buildRelatedReadingPlan(ctx.entityGraph, topics, {
    primaryClusterId: clusters[0]?.id,
    excludeArticleId: (ctx.article.id || '').trim()
  });

  const hubLinks = suggestHubLinks(topics, {
    pillar
  });

  const contextualLinks = suggestContextualLinks(relatedReading, {
    excludeEntityIds: hubLinks.map((h) => h.targetEntityId)
  });

  if (clusters.length && contextualLinks.length) {
    clusters[0].memberSuggestions = contextualLinks.slice(0, 4);
  }

  const freshness = deriveFreshness(
    {
      updatedAt: ctx.article.updatedAt,
      publishedAt: ctx.article.publishedAt,
      publishAt: ctx.article.publishAt,
      createdAt: ctx.article.createdAt,
      status: ctx.article.status
    },
    ctx.now
  );

  const model: ContentIntelPageModel = {
    topics,
    pillar,
    clusters,
    relatedReading,
    contextualLinks,
    hubLinks,
    freshness,
    evidenceSummary: []
  };
  model.evidenceSummary = buildEvidenceSummary(model);
  return model;
}

/**
 * Build vehicle ContentIntelPageModel from page graph + recommendation slate.
 * Optional LRU by model entity id + updatedAt/related fingerprint.
 */
export function buildVehicleContentIntel(ctx: VehicleContentIntelContext): ContentIntelPageModel {
  try {
    if (!ctx?.entityGraph) return emptyContentIntelPageModel();

    const stamp = vehicleCacheStamp(ctx);
    const cached = getCachedContentIntel(stamp.id, stamp.version);
    if (cached) return cloneModel(cached);

    const model = buildVehicleContentIntelUnsafe(ctx);
    if (stamp.id) {
      setCachedContentIntel(stamp.id, stamp.version, cloneModel(model));
    }
    return model;
  } catch {
    return emptyContentIntelPageModel();
  }
}

/**
 * Build article ContentIntelPageModel from page graph + article DTO + slate.
 */
export function buildArticleContentIntel(ctx: ArticleContentIntelContext): ContentIntelPageModel {
  try {
    if (!ctx?.entityGraph || !ctx.article) return emptyContentIntelPageModel();

    const stamp = articleCacheStamp(ctx);
    const cached = getCachedContentIntel(stamp.id, stamp.version);
    if (cached) return cloneModel(cached);

    const model = buildArticleContentIntelUnsafe(ctx);
    if (stamp.id) {
      setCachedContentIntel(stamp.id, stamp.version, cloneModel(model));
    }
    return model;
  } catch {
    return emptyContentIntelPageModel();
  }
}

/**
 * Failure-isolated wrappers — always return a model; never throw to page/AEO/SEO.
 */
export function safeBuildVehicleContentIntel(
  ctx: VehicleContentIntelContext
): ContentIntelPageModel {
  return safeRun(() => buildVehicleContentIntel(ctx), emptyContentIntelPageModel());
}

export function safeBuildArticleContentIntel(
  ctx: ArticleContentIntelContext
): ContentIntelPageModel {
  return safeRun(() => buildArticleContentIntel(ctx), emptyContentIntelPageModel());
}
