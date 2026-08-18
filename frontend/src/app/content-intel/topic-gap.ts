/**
 * Phase 7.4 M3 — page-local missing-topic detection (architecture §10.3).
 * Every gap cites fields/edges that are demonstrably absent on the page graph.
 * No AI ideas, no speculative titles, no catalog scan. Corpus job stays M4 (§10.2).
 */

import { normalizeArticleRelationships } from '../entity/entity-normalize';
import type { EntityGraph } from '../entity/entity.types';
import {
  EDITORIAL_TOPIC_GAPS_MAX,
  MissingTopicReport,
  RelatedReadingPlan,
  TopicGap,
  TopicMembership
} from './content-intel.types';

export interface TopicGapInput {
  pageKind: 'vehicle' | 'article';
  /** Entity the editor would act on (model / article entity id). */
  entityId: string;
  graph: EntityGraph | null | undefined;
  topics: TopicMembership[];
  relatedReading: RelatedReadingPlan;
  /** Article pages only. */
  relationships?: unknown;
}

const CHARGING_FACET_KINDS = new Set(['porttype', 'chemistry']);

function push(out: TopicGap[], seen: Set<string>, gap: TopicGap): void {
  if (out.length >= EDITORIAL_TOPIC_GAPS_MAX) return;
  const key = `${gap.kind}:${gap.affectedEntityId}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(gap);
}

function hasChargingFacetEvidence(graph: EntityGraph | null | undefined): string[] {
  const refs: string[] = [];
  for (const n of graph?.nodes || []) {
    if (n.type !== 'facet') continue;
    const kind = String(n.attrs['facetKind'] || '').toLowerCase();
    if (CHARGING_FACET_KINDS.has(kind)) refs.push(`has_facet:${kind}`);
  }
  return refs;
}

/**
 * Detect evidence-backed coverage gaps for one page.
 * A gap means "this relationship is absent in CMS/graph", never "this article should say X".
 */
export function detectMissingTopics(
  input: TopicGapInput | null | undefined
): MissingTopicReport {
  if (!input?.entityId) return { gaps: [] };

  const gaps: TopicGap[] = [];
  const seen = new Set<string>();
  const entityId = input.entityId.trim();
  const topics = input.topics || [];
  const plan = input.relatedReading;

  const modelTopic = topics.find((t) => t.topic.kind === 'model');
  const brandTopic = topics.find((t) => t.topic.kind === 'brand');

  if (input.pageKind === 'vehicle') {
    if (!(plan?.articles?.length || 0)) {
      push(gaps, seen, {
        topicId: modelTopic?.topic.id || `topic:model:${entityId}`,
        kind: 'buying_guide',
        label: modelTopic?.topic.label || 'This model',
        affectedEntityId: entityId,
        severity: 'recommended',
        suggestedAction:
          'No article links to this model — add relationships.relatedVehicleIds on a buying guide.',
        evidenceRefs: ['relatedReading.articles=0', 'recommended_article=0']
      });
    }

    if (!(plan?.comparisons?.length || 0)) {
      push(gaps, seen, {
        topicId: modelTopic?.topic.id || `topic:model:${entityId}`,
        kind: 'comparison_article',
        label: modelTopic?.topic.label || 'This model',
        affectedEntityId: entityId,
        severity: 'recommended',
        suggestedAction:
          'No compare pair resolves for this model — add related vehicles so a comparison can form.',
        evidenceRefs: ['compares_with=0', 'relatedReading.comparisons=0']
      });
    }
  }

  if (brandTopic) {
    const brandEntityId =
      brandTopic.topic.entityIds.find((id) => id.startsWith('brand:')) ||
      brandTopic.topic.entityIds[0] ||
      '';
    const hasBrandArticle = (input.graph?.edges || []).some(
      (e) => e.type === 'article_about_brand' && (!brandEntityId || e.to.id === brandEntityId)
    );
    if (brandEntityId && !hasBrandArticle) {
      push(gaps, seen, {
        topicId: brandTopic.topic.id,
        kind: 'ownership_guide',
        label: brandTopic.topic.label,
        affectedEntityId: brandEntityId,
        severity: 'info',
        suggestedAction:
          'No article links to this brand — add relationships.relatedBrandIds on an ownership guide.',
        evidenceRefs: ['article_about_brand=0', 'relationships.relatedBrandIds']
      });
    }
  }



  if (input.pageKind === 'article') {
    const rel = normalizeArticleRelationships(input.relationships);
    const onlyWeakTopics = !topics.some((t) => t.confidence === 'grounded');
    const noEditorialIds =
      !rel.relatedArticleIds.length &&
      !rel.relatedVehicleIds.length &&
      !rel.relatedBrandIds.length;
    if (noEditorialIds && onlyWeakTopics) {
      push(gaps, seen, {
        topicId: 'topic:site_hub:articles',
        kind: 'editorial_links',
        label: 'Editorial entity links',
        affectedEntityId: entityId,
        severity: 'important',
        suggestedAction:
          'No editorial entity links and no grounded topic — add relationships.relatedVehicleIds or relatedBrandIds.',
        evidenceRefs: [
          'relationships.relatedVehicleIds=0',
          'relationships.relatedBrandIds=0',
          'topics.confidence!=grounded'
        ]
      });
    }
  }

  return { gaps };
}
