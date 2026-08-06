/**
 * Phase 7.4 M3 — EditorialRecoPack: read-only advice for admin/operators.
 *
 * Contract (architecture §11.3):
 * - Never mutates CMS, article HTML, or the RecommendationService slate.
 * - Never invents a recommendation: each one cites fields/edges that exist or are absent.
 * - Never runs on an anonymous public detail render — admin/editorial callers only.
 * - On failure returns an empty pack so Entity Graph / AEO / SEO / SchemaService continue.
 */

import { normalizeArticleRelationships } from '../entity/entity-normalize';
import type { EntityGraph } from '../entity/entity.types';
import {
  ContentIntelPageModel,
  ContentHealthReport,
  CONTENT_INTEL_RELATED_ARTICLES_MAX,
  CONTENT_INTEL_RELATED_VEHICLES_MAX,
  EDITORIAL_RECOMMENDATIONS_MAX,
  EDITORIAL_SUGGEST_BRANDS_MAX,
  EDITORIAL_WARNINGS_MAX,
  EditorialConfidence,
  EditorialRecoKind,
  EditorialRecoPack,
  EditorialRecommendation,
  InternalLinkAuditReport,
  LinkEvidence,
  MissingTopicReport,
  TopicGapKind,
  emptyEditorialRecoPack
} from './content-intel.types';
import { auditInternalLinks } from './link-audit';
import { deriveContentHealth } from './content-health';
import { detectMissingTopics } from './topic-gap';

export interface EditorialPackContext {
  pageKind: 'vehicle' | 'article';
  /** Entity the editor acts on (model entity id / `article:{id}`). */
  entityId: string;
  model: ContentIntelPageModel;
  graph?: EntityGraph | null;
  /** Article pages only — raw CMS relationships object. */
  relationships?: unknown;
}

/** Generic label Entity Graph assigns to an article id it cannot resolve (architecture §7.4). */
const STUB_ARTICLE_LABEL = 'Related article';

const GAP_TO_RECO: Record<TopicGapKind, EditorialRecoKind> = {
  buying_guide: 'missing_related_article',
  comparison_article: 'missing_related_vehicle',
  ownership_guide: 'missing_related_article',
  charging_topic: 'missing_pillar_cluster',
  editorial_links: 'weak_topical_coverage'
};

/** Rule-based only: CMS field absence → high, graph edge counts → medium, heuristics → low. */
const GAP_CONFIDENCE: Record<TopicGapKind, EditorialConfidence> = {
  buying_guide: 'medium',
  comparison_article: 'medium',
  ownership_guide: 'medium',
  charging_topic: 'low',
  editorial_links: 'high'
};

function recoId(kind: EditorialRecoKind, affected: string, target?: string): string {
  return target ? `reco:${kind}:${affected}:${target}` : `reco:${kind}:${affected}`;
}

function addReco(
  out: EditorialRecommendation[],
  seen: Set<string>,
  reco: EditorialRecommendation
): void {
  if (out.length >= EDITORIAL_RECOMMENDATIONS_MAX) return;
  if (!reco.affectedEntityId || !reco.evidence?.refs?.length) return;
  if (seen.has(reco.id)) return;
  seen.add(reco.id);
  out.push(reco);
}

function evidence(refs: string[], source: LinkEvidence['source']): LinkEvidence {
  return { source, refs: [...new Set(refs.filter(Boolean))] };
}

function recommendationsFromGaps(
  report: MissingTopicReport,
  out: EditorialRecommendation[],
  seen: Set<string>
): void {
  for (const gap of report.gaps) {
    const kind = GAP_TO_RECO[gap.kind];
    addReco(out, seen, {
      id: recoId(kind, gap.affectedEntityId, gap.topicId),
      kind,
      affectedEntityId: gap.affectedEntityId,
      targetEntityId: gap.topicId,
      message: `${gap.label}: ${gap.suggestedAction}`,
      suggestedAction: gap.suggestedAction,
      evidence: evidence(gap.evidenceRefs, 'editorial_relationship'),
      confidence: GAP_CONFIDENCE[gap.kind]
    });
  }
}

function recommendationsFromHealth(
  health: ContentHealthReport,
  out: EditorialRecommendation[],
  seen: Set<string>
): void {
  for (const signal of health.signals) {
    if (signal.kind === 'stale') {
      addReco(out, seen, {
        id: recoId('stale_content', signal.affectedEntityId),
        kind: 'stale_content',
        affectedEntityId: signal.affectedEntityId,
        message: `Content is stale (${signal.detail}).`,
        suggestedAction: 'Review and update, then save to refresh updatedAt.',
        evidence: evidence(signal.evidenceRefs, 'freshness_rule'),
        confidence: 'high'
      });
    }
    if (signal.kind === 'missing_relationships') {
      addReco(out, seen, {
        id: recoId('missing_related_vehicle', signal.affectedEntityId),
        kind: 'missing_related_vehicle',
        affectedEntityId: signal.affectedEntityId,
        message: 'No editorial relationships are set on this article.',
        suggestedAction:
          'Add relationships.relatedVehicleIds / relatedArticleIds / relatedBrandIds.',
        evidence: evidence(signal.evidenceRefs, 'editorial_relationship'),
        confidence: 'high'
      });
    }
    if (signal.kind === 'weak_coverage') {
      addReco(out, seen, {
        id: recoId('weak_topical_coverage', signal.affectedEntityId),
        kind: 'weak_topical_coverage',
        affectedEntityId: signal.affectedEntityId,
        message: 'No grounded brand or model topic resolves for this page.',
        suggestedAction: 'Link a brand or vehicle so the page joins a topic cluster.',
        evidence: evidence(signal.evidenceRefs, 'structural_entity'),
        confidence: 'medium'
      });
    }
  }
}

function recommendationsFromAudit(
  audit: InternalLinkAuditReport,
  out: EditorialRecommendation[],
  seen: Set<string>
): void {
  for (const finding of audit.findings) {
    if (finding.kind !== 'orphan_page' && finding.kind !== 'weakly_connected') continue;
    addReco(out, seen, {
      id: recoId('missing_internal_link', finding.affectedEntityId),
      kind: 'missing_internal_link',
      affectedEntityId: finding.affectedEntityId,
      message:
        finding.kind === 'orphan_page'
          ? 'Page is an orphan: only site-wide hubs link out.'
          : `Page is weakly connected: ${finding.detail}.`,
      suggestedAction: 'Add editorial related vehicles or articles to build internal links.',
      evidence: evidence(finding.evidenceRefs, 'structural_entity'),
      confidence: 'medium'
    });
  }
}

function recommendationsFromClusters(
  ctx: EditorialPackContext,
  out: EditorialRecommendation[],
  seen: Set<string>
): void {
  const { model, entityId } = ctx;
  if (model.pillar && model.clusters.length) return;
  const refs: string[] = [];
  if (!model.pillar) refs.push('pillar=undefined');
  if (!model.clusters.length) refs.push('clusters=0');
  addReco(out, seen, {
    id: recoId('missing_pillar_cluster', entityId),
    kind: 'missing_pillar_cluster',
    affectedEntityId: entityId,
    message: 'Page has no pillar or cluster membership.',
    suggestedAction: 'Link a brand or model so the page anchors to a pillar.',
    evidence: evidence(refs, 'hub_taxonomy'),
    confidence: 'low'
  });
}

/** Warnings: unresolved stubs, self-references, ids missing from the resolved slate (§11.2). */
function buildWarnings(ctx: EditorialPackContext): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();
  const push = (w: string) => {
    if (warnings.length >= EDITORIAL_WARNINGS_MAX || seen.has(w)) return;
    seen.add(w);
    warnings.push(w);
  };

  const { model, entityId, graph } = ctx;

  for (const row of model.relatedReading.vehicles) {
    const name = (row.item.name || '').trim();
    // Entity Graph falls back to a generic label when it cannot resolve an id;
    // the reliable signal is that neither model nor brand metadata came back.
    const unresolved =
      !name ||
      name === row.item.id ||
      (!row.item.parentModel?.trim() && !row.item.brandName?.trim());
    if (unresolved) {
      push(`Related vehicle ${row.item.id} is an unresolved stub — resolve its metadata.`);
    }
    if (row.item.id && entityId.endsWith(row.item.id)) {
      push(`Related vehicle ${row.item.id} is a self-reference — remove it.`);
    }
  }
  for (const row of model.relatedReading.articles) {
    const title = (row.item.title || '').trim();
    if (!title || title === row.item.id || title === STUB_ARTICLE_LABEL) {
      push(`Related article ${row.item.id} is an unresolved stub — resolve its metadata.`);
    }
    if (row.item.id && entityId.endsWith(row.item.id)) {
      push(`Related article ${row.item.id} is a self-reference — remove it.`);
    }
  }

  for (const node of graph?.nodes || []) {
    if (warnings.length >= EDITORIAL_WARNINGS_MAX) break;
    const status = String(node.attrs?.['status'] || '').trim();
    if (status && status.toLowerCase() !== 'published' && node.type === 'variant') {
      push(`${node.id} has status "${status}" — it may not be publicly visible.`);
    }
  }

  return warnings;
}

/**
 * Suggestions are relationships the editor does not have yet.
 * Ids already stored in CMS are dropped so the pack never proposes a duplicate relationship.
 */
function newIds(candidates: string[], existing: string[], max: number): string[] {
  const already = new Set(existing.map((id) => (id || '').trim()).filter(Boolean));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of candidates) {
    const id = (raw || '').trim();
    if (!id || seen.has(id) || already.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

function brandIdCandidates(ctx: EditorialPackContext): string[] {
  return ctx.model.relatedReading.vehicles.map((row) => (row.item.categoryId || '').trim());
}

/**
 * Build the editorial pack for one page. Page-local and pure — no HTTP, no catalog scan.
 * Suggestion order follows the RecommendationService slate; CI never re-ranks it.
 */
export function buildEditorialRecoPack(ctx: EditorialPackContext): EditorialRecoPack {
  if (!ctx?.model || !ctx.entityId?.trim()) {
    return emptyEditorialRecoPack(ctx?.entityId || '');
  }

  const entityId = ctx.entityId.trim();
  const { model } = ctx;
  const existing = normalizeArticleRelationships(ctx.relationships);

  const health = deriveContentHealth({
    entityId,
    freshness: model.freshness,
    topics: model.topics,
    relatedReading: model.relatedReading,
    relationships: ctx.relationships,
    supportsEditorialRelationships: ctx.pageKind === 'article'
  });

  const gaps = detectMissingTopics({
    pageKind: ctx.pageKind,
    entityId,
    graph: ctx.graph,
    topics: model.topics,
    relatedReading: model.relatedReading,
    relationships: ctx.relationships
  });

  const linkAudit = auditInternalLinks({
    entityId,
    hubLinks: model.hubLinks,
    contextualLinks: model.contextualLinks,
    relatedReading: model.relatedReading
  });

  const recommendations: EditorialRecommendation[] = [];
  const seen = new Set<string>();
  recommendationsFromGaps(gaps, recommendations, seen);
  recommendationsFromHealth(health, recommendations, seen);
  recommendationsFromAudit(linkAudit, recommendations, seen);
  recommendationsFromClusters(ctx, recommendations, seen);

  return {
    suggestRelatedVehicleIds: newIds(
      model.relatedReading.vehicles.map((v) => v.item.id),
      existing.relatedVehicleIds,
      CONTENT_INTEL_RELATED_VEHICLES_MAX
    ),
    suggestRelatedArticleIds: newIds(
      model.relatedReading.articles.map((a) => a.item.id),
      existing.relatedArticleIds,
      CONTENT_INTEL_RELATED_ARTICLES_MAX
    ),
    suggestRelatedBrandIds: newIds(
      brandIdCandidates(ctx),
      existing.relatedBrandIds,
      EDITORIAL_SUGGEST_BRANDS_MAX
    ),
    suggestInternalLinkTargets: model.contextualLinks.map((l) => ({
      ...l,
      evidence: { source: l.evidence.source, refs: [...l.evidence.refs] }
    })),
    missingTopics: gaps.gaps.map((g) => g.topicId),
    freshness: model.freshness,
    warnings: buildWarnings(ctx),
    recommendations,
    health,
    gaps,
    linkAudit
  };
}

/** Failure isolation: editorial intelligence must never throw into a page or admin view. */
export function safeBuildEditorialRecoPack(ctx: EditorialPackContext): EditorialRecoPack {
  try {
    return buildEditorialRecoPack(ctx);
  } catch {
    return emptyEditorialRecoPack(ctx?.entityId || '');
  }
}
