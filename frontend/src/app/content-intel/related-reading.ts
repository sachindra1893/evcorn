/**
 * Phase 7.4 — RelatedReadingPlan composition.
 * Consumes Entity Graph outbound lists (RecommendationService / editorial order).
 * Never ranks, scores, or replaces RecommendationService — organize + label only.
 */

import {
  comparisonsFromGraph,
  relatedArticlesFromGraph,
  relatedVehiclesFromGraph
} from '../entity/entity-graph';
import type { EntityGraph } from '../entity/entity.types';
import {
  CONTENT_INTEL_COMPARISONS_MAX,
  CONTENT_INTEL_RELATED_ARTICLES_MAX,
  CONTENT_INTEL_RELATED_VEHICLES_MAX,
  LinkEvidence,
  LinkSuggestion,
  RelatedReadingPlan,
  TopicMembership,
  emptyRelatedReadingPlan
} from './content-intel.types';
import {
  canonicalLinkSuggestions,
  compareTargetEntityId
} from './link-canonical';

function evidenceForEdgeSource(
  graph: EntityGraph,
  targetRawId: string,
  kind: 'vehicle' | 'article'
): LinkEvidence {
  const editorialType =
    kind === 'vehicle' ? 'article_about_vehicle' : 'article_related_article';
  const recType = kind === 'vehicle' ? 'recommended_vehicle' : 'recommended_article';
  const entityPrefix = kind === 'vehicle' ? 'variant:' : 'article:';

  const matchesTarget = (toId: string): boolean =>
    toId === `${entityPrefix}${targetRawId}` ||
    toId === targetRawId ||
    toId.endsWith(`:${targetRawId}`);

  const hasEditorial = graph.edges.some(
    (e) => e.type === editorialType && matchesTarget(e.to.id)
  );
  if (hasEditorial) {
    return {
      source: 'editorial_relationship',
      refs: [
        kind === 'vehicle'
          ? 'relationships.relatedVehicleIds'
          : 'relationships.relatedArticleIds',
        editorialType
      ]
    };
  }

  return {
    source: 'recommendation',
    refs: [recType, 'RecommendationService']
  };
}

/** Deterministic citation-ready reason — evidence fields only, never speculative. */
export function reasonFromEvidence(
  evidence: LinkEvidence,
  topicLabels: string[]
): string {
  if (evidence.source === 'editorial_relationship') {
    return 'Linked by editor to this guide';
  }
  if (
    evidence.refs.some((r) => r.includes('has_facet') || r.includes('facet')) &&
    topicLabels.length
  ) {
    return `Shares body style: ${topicLabels[0]}`;
  }
  if (topicLabels.length && evidence.source === 'structural_entity') {
    return 'Same brand in EVCorn catalog';
  }
  if (evidence.source === 'recommendation') {
    return 'Recommended in the same category';
  }
  if (topicLabels.length) {
    return 'Same brand in EVCorn catalog';
  }
  return 'Related on EVCorn';
}

/**
 * Shared topic labels between page membership and a related item's known attrs.
 * Page-local only — uses item brand/model/category fields already on the slate row.
 * Never invents from title keywords.
 */
export function sharedTopicLabels(
  memberships: TopicMembership[],
  item: {
    brandName?: string;
    categoryId?: string;
    parentModel?: string;
  }
): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const m of memberships) {
    if (m.topic.kind === 'site_hub' || m.topic.kind === 'cluster') continue;
    let hit = false;
    if (m.topic.kind === 'brand') {
      const brandKey = m.topic.id.replace(/^topic:brand:/, '');
      if (
        (item.categoryId && item.categoryId === brandKey) ||
        (item.brandName &&
          item.brandName.trim().toLowerCase() === m.topic.label.toLowerCase())
      ) {
        hit = true;
      }
    }
    if (m.topic.kind === 'model' && item.parentModel) {
      if (item.parentModel.trim().toLowerCase() === m.topic.label.toLowerCase()) {
        hit = true;
      }
    }
    if (hit && !seen.has(m.topic.label)) {
      seen.add(m.topic.label);
      labels.push(m.topic.label);
    }
  }
  return labels;
}

/**
 * Build related-reading plan from graph edges. Preserves slate order.
 */
export function buildRelatedReadingPlan(
  graph: EntityGraph | null | undefined,
  memberships: TopicMembership[],
  opts?: {
    primaryClusterId?: string;
    excludeVehicleId?: string;
    excludeArticleId?: string;
  }
): RelatedReadingPlan {
  if (!graph?.edges?.length) {
    return emptyRelatedReadingPlan();
  }

  const excludeV = (opts?.excludeVehicleId || '').trim();
  const excludeA = (opts?.excludeArticleId || '').trim();

  const vehicles = relatedVehiclesFromGraph(graph)
    .filter((v) => !excludeV || v.id !== excludeV)
    .slice(0, CONTENT_INTEL_RELATED_VEHICLES_MAX)
    .map((item) => {
      const evidence = evidenceForEdgeSource(graph, item.id, 'vehicle');
      const topicLabels = sharedTopicLabels(memberships, item);
      return {
        item,
        topicLabels,
        evidence,
        reason: reasonFromEvidence(evidence, topicLabels)
      };
    });

  const articles = relatedArticlesFromGraph(graph)
    .filter((a) => !excludeA || a.id !== excludeA)
    .slice(0, CONTENT_INTEL_RELATED_ARTICLES_MAX)
    .map((item) => {
      const evidence = evidenceForEdgeSource(graph, item.id, 'article');
      return {
        item,
        topicLabels: [] as string[],
        evidence,
        reason: reasonFromEvidence(evidence, [])
      };
    });

  const comparisons = comparisonsFromGraph(graph)
    .slice(0, CONTENT_INTEL_COMPARISONS_MAX)
    .map((item) => ({
      item,
      evidence: {
        source: 'recommendation' as const,
        refs: ['compares_with', 'RecommendationService']
      },
      reason: 'Compare peers from recommendations'
    }));

  return {
    vehicles,
    articles,
    comparisons,
    primaryClusterId: opts?.primaryClusterId
  };
}

/**
 * Emit canonical LinkSuggestions from a related-reading plan.
 * Preserves RecommendationService order; merges evidence per entityId.
 * Hrefs are already entity-href paths from the graph slate.
 */
export function linkSuggestionsFromRelatedReading(
  plan: RelatedReadingPlan,
  opts?: {
    excludeEntityIds?: Iterable<string>;
  }
): LinkSuggestion[] {
  const excluded = new Set(
    [...(opts?.excludeEntityIds || [])].map((id) => (id || '').trim()).filter(Boolean)
  );
  const raw: LinkSuggestion[] = [];
  const orderEntityIds: string[] = [];

  for (const row of plan.vehicles) {
    if (!row.item.href || !row.evidence?.refs?.length || !row.item.id) continue;
    const targetEntityId = `variant:${row.item.id}`;
    orderEntityIds.push(targetEntityId);
    if (excluded.has(targetEntityId)) continue;
    raw.push({
      label: row.item.name || 'Related EV',
      href: row.item.href,
      targetEntityId,
      relKind: 'related_reading',
      evidence: row.evidence
    });
  }

  for (const row of plan.articles) {
    if (!row.item.href || !row.evidence?.refs?.length || !row.item.id) continue;
    const targetEntityId = `article:${row.item.id}`;
    orderEntityIds.push(targetEntityId);
    if (excluded.has(targetEntityId)) continue;
    raw.push({
      label: row.item.title || 'Related article',
      href: row.item.href,
      targetEntityId,
      relKind: 'related_reading',
      evidence: row.evidence
    });
  }

  for (const row of plan.comparisons) {
    if (!row.item.href || !row.evidence?.refs?.length) continue;
    const targetEntityId = compareTargetEntityId(row.item.href);
    if (!targetEntityId) continue;
    orderEntityIds.push(targetEntityId);
    if (excluded.has(targetEntityId)) continue;
    raw.push({
      label: row.item.label,
      href: row.item.href,
      targetEntityId,
      relKind: 'compare',
      evidence: row.evidence
    });
  }

  return canonicalLinkSuggestions(raw, orderEntityIds);
}
