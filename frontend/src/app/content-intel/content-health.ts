/**
 * Phase 7.4 M3 — ContentHealth signals from existing CMS fields + page graph only.
 * Reporting only: never edits content, never writes CMS, never reorders RecommendationService.
 */

import { normalizeArticleRelationships } from '../entity/entity-normalize';
import type { NormalizedArticleRelationships } from '../entity/entity.types';
import {
  ContentHealthReport,
  ContentHealthSignal,
  ContentHealthState,
  FreshnessSignal,
  RelatedReadingPlan,
  TopicMembership,
  emptyContentHealthReport,
  emptyFreshnessSignal
} from './content-intel.types';

export interface ContentHealthInput {
  /** Entity the report is about (model / article entity id). */
  entityId: string;
  freshness: FreshnessSignal;
  topics: TopicMembership[];
  relatedReading: RelatedReadingPlan;
  /** Article pages only — editorial relationship arrays as stored in CMS. */
  relationships?: unknown;
  /** True when the page kind can carry editorial relationships (article). */
  supportsEditorialRelationships?: boolean;
}

function relatedTotal(plan: RelatedReadingPlan | null | undefined): number {
  if (!plan) return 0;
  return (
    (plan.vehicles?.length || 0) +
    (plan.articles?.length || 0) +
    (plan.comparisons?.length || 0)
  );
}

function hasEditorialEvidence(plan: RelatedReadingPlan | null | undefined): boolean {
  if (!plan) return false;
  const rows = [...(plan.vehicles || []), ...(plan.articles || [])];
  return rows.some((r) => r.evidence?.source === 'editorial_relationship');
}

function isEmptyRelationships(rel: NormalizedArticleRelationships): boolean {
  return (
    !rel.relatedArticleIds.length &&
    !rel.relatedVehicleIds.length &&
    !rel.relatedBrandIds.length
  );
}

function stateFromSignals(signals: ContentHealthSignal[]): ContentHealthState {
  const kinds = new Set(signals.map((s) => s.kind));
  if (kinds.has('orphan')) return 'at_risk';
  if (kinds.has('stale') && kinds.has('missing_relationships')) return 'at_risk';
  if (kinds.has('stale') || kinds.has('missing_relationships') || kinds.has('weak_coverage')) {
    return 'attention';
  }
  return 'healthy';
}

/**
 * Derive health signals for one page. Pure and page-local — no corpus scan.
 * Signals only describe fields that already exist; nothing is inferred about copy quality.
 */
export function deriveContentHealth(
  input: ContentHealthInput | null | undefined
): ContentHealthReport {
  if (!input?.entityId) return emptyContentHealthReport(input?.entityId || '');

  const entityId = input.entityId.trim();
  const freshness = input.freshness || emptyFreshnessSignal();
  const signals: ContentHealthSignal[] = [];

  if (freshness.state === 'stale') {
    signals.push({
      kind: 'stale',
      affectedEntityId: entityId,
      detail: freshness.reasons.join('; ') || 'content is stale',
      evidenceRefs: ['freshness.state=stale', ...freshness.reasons]
    });
  } else if (freshness.state === 'fresh') {
    signals.push({
      kind: 'recently_updated',
      affectedEntityId: entityId,
      detail: freshness.lastUpdated
        ? `last updated ${freshness.lastUpdated}`
        : 'recently updated',
      evidenceRefs: ['freshness.state=fresh']
    });
  }

  if (input.supportsEditorialRelationships) {
    const rel = normalizeArticleRelationships(input.relationships);
    if (isEmptyRelationships(rel)) {
      signals.push({
        kind: 'missing_relationships',
        affectedEntityId: entityId,
        detail: 'no editorial relatedArticleIds / relatedVehicleIds / relatedBrandIds',
        evidenceRefs: [
          'relationships.relatedArticleIds',
          'relationships.relatedVehicleIds',
          'relationships.relatedBrandIds'
        ]
      });
    }
  }

  const grounded = (input.topics || []).filter((t) => t.confidence === 'grounded');
  if (!grounded.length) {
    signals.push({
      kind: 'weak_coverage',
      affectedEntityId: entityId,
      detail: 'no grounded brand/model topic on this page',
      evidenceRefs: ['topics.confidence!=grounded']
    });
  }

  if (relatedTotal(input.relatedReading) === 0 && !hasEditorialEvidence(input.relatedReading)) {
    signals.push({
      kind: 'orphan',
      affectedEntityId: entityId,
      detail: 'no related vehicles, articles, or comparisons resolve for this page',
      evidenceRefs: [
        'relatedReading.vehicles=0',
        'relatedReading.articles=0',
        'relatedReading.comparisons=0'
      ]
    });
  }

  return {
    entityId,
    state: stateFromSignals(signals),
    freshness,
    signals
  };
}
