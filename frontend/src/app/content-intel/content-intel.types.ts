/**
 * Phase 7.4 Content Intelligence — derived page model (ephemeral, never CMS-persisted).
 * Orchestrates topics / pillars / link suggestions over Entity Graph + CMS facts.
 * Does not own ranking (RecommendationService), answer chrome (AEO), or JSON-LD (SchemaService).
 */

import type {
  GraphRelatedArticle,
  GraphRelatedComparison,
  GraphRelatedVehicle
} from '../entity/entity-graph';
import type { EntityGraph } from '../entity/entity.types';
import type { ArticleLike, BrandLike, VehicleLike } from '../entity/entity-normalize';

export type IsoDateString = string;

/** Caps locked in Phase 7.4 architecture §4.3 / §7.3 */
export const CONTENT_INTEL_TOPICS_MAX = 8;
export const CONTENT_INTEL_CLUSTERS_MAX = 4;
export const CONTENT_INTEL_CONTEXTUAL_LINKS_MAX = 8;
export const CONTENT_INTEL_RELATED_VEHICLES_MAX = 6;
export const CONTENT_INTEL_RELATED_ARTICLES_MAX = 4;
export const CONTENT_INTEL_COMPARISONS_MAX = 3;

export type TopicKind =
  | 'brand'
  | 'model'
  | 'facet'
  | 'article_category'
  | 'site_hub'
  | 'cluster';

/** Explainable ordinal for sorting suggestions only — never a user-facing AI score. */
export type TopicConfidence = 'grounded' | 'inferred_facet' | 'weak_category' | 'hub';

export type LinkRelKind =
  | 'hub'
  | 'cluster_sibling'
  | 'entity_mention'
  | 'related_reading'
  | 'compare'
  | 'editorial_pending';

export type LinkEvidenceSource =
  | 'editorial_relationship'
  | 'related_block'
  | 'recommendation'
  | 'structural_entity'
  | 'facet_membership'
  | 'shared_entity'
  | 'hub_taxonomy'
  | 'freshness_rule';

export type FreshnessState = 'fresh' | 'aging' | 'stale' | 'unknown';
export type EditorialFreshnessPriority = 'none' | 'review' | 'urgent';

export interface TopicRef {
  /** Stable: `topic:{kind}:{key}` */
  id: string;
  kind: TopicKind;
  /** Display from existing names only — never invented. */
  label: string;
  /** Only when a real public hub URL exists today. */
  href?: string;
  /** Entity Graph ids this topic is grounded in. */
  entityIds: string[];
}

export interface TopicMembership {
  topic: TopicRef;
  confidence: TopicConfidence;
  /** Concrete field paths or edge types, e.g. `has_facet`, `relationships.relatedBrandIds`. */
  evidenceRefs: string[];
}

export interface PillarRef {
  id: string;
  label: string;
  href: string;
  /** Topic ids this pillar anchors. */
  topicIds: string[];
}

export interface ClusterRef {
  /** Stable: `cluster:model:{id}` | `cluster:brand:{id}` | `cluster:facet:{kind}:{key}` | … */
  id: string;
  label: string;
  topicId: string;
  /** Page-local member entity ids only (capped). */
  memberEntityIds: string[];
  memberSuggestions: LinkSuggestion[];
}

export interface LinkEvidence {
  source: LinkEvidenceSource;
  /** Concrete field paths or edge types. */
  refs: string[];
}

export interface LinkSuggestion {
  label: string;
  /** Via entity-href only. */
  href: string;
  /**
   * Stable Entity Graph (or site-hub) id — the single canonical target.
   * Deduplication / merge key for LinkSuggestions (never URL string).
   */
  targetEntityId: string;
  relKind: LinkRelKind;
  evidence: LinkEvidence;
  /** Pass-through only if from RecommendationService; optional. */
  weight?: number;
}

export interface RelatedReadingItemVehicle {
  item: GraphRelatedVehicle;
  topicLabels: string[];
  evidence: LinkEvidence;
  /** Deterministic citation-ready reason from evidence only. */
  reason?: string;
}

export interface RelatedReadingItemArticle {
  item: GraphRelatedArticle;
  topicLabels: string[];
  evidence: LinkEvidence;
  reason?: string;
}

export interface RelatedReadingItemComparison {
  item: GraphRelatedComparison;
  evidence: LinkEvidence;
  reason?: string;
}

export interface RelatedReadingPlan {
  vehicles: RelatedReadingItemVehicle[];
  articles: RelatedReadingItemArticle[];
  comparisons: RelatedReadingItemComparison[];
  primaryClusterId?: string;
}

export interface FreshnessSignal {
  lastUpdated?: IsoDateString;
  ageDays?: number;
  state: FreshnessState;
  /** Admin pack only — omit or `none` on public. */
  editorialPriority?: EditorialFreshnessPriority;
  reasons: string[];
}

/* ------------------------------------------------------------------ *
 * Phase 7.4 M3 — Editorial Intelligence & Content Health.
 * Internal/admin surfaces only. Never rendered as public chrome,
 * never persisted to CMS, never mutates article content.
 * ------------------------------------------------------------------ */

/** Caps locked for M3 editorial surfaces. */
export const EDITORIAL_RECOMMENDATIONS_MAX = 12;
export const EDITORIAL_TOPIC_GAPS_MAX = 8;
export const EDITORIAL_LINK_FINDINGS_MAX = 12;
export const EDITORIAL_WARNINGS_MAX = 8;
export const EDITORIAL_SUGGEST_BRANDS_MAX = 4;

/** Below this many distinct proven outbound destinations a page is weakly connected. */
export const WEAK_CONNECTION_MIN_DESTINATIONS = 2;

export type EditorialRecoKind =
  | 'missing_internal_link'
  | 'missing_related_vehicle'
  | 'missing_related_article'
  | 'missing_pillar_cluster'
  | 'weak_topical_coverage'
  | 'stale_content';

/**
 * Rule-based only — never a model score.
 * high: a CMS field is directly present/absent; medium: graph edge counts;
 * low: hub/facet heuristics that an editor should sanity-check.
 */
export type EditorialConfidence = 'high' | 'medium' | 'low';

export interface EditorialRecommendation {
  /** Stable dedupe key: `reco:{kind}:{affectedEntityId}[:{targetEntityId}]`. */
  id: string;
  kind: EditorialRecoKind;
  /** Entity the editor must act on. */
  affectedEntityId: string;
  targetEntityId?: string;
  /** Deterministic, built from evidence only. */
  message: string;
  /** Concrete CMS field path or edge type the editor can change. */
  suggestedAction: string;
  evidence: LinkEvidence;
  confidence: EditorialConfidence;
}

export type ContentHealthState = 'healthy' | 'attention' | 'at_risk';

export type ContentHealthSignalKind =
  | 'stale'
  | 'recently_updated'
  | 'missing_relationships'
  | 'weak_coverage'
  | 'orphan';

export interface ContentHealthSignal {
  kind: ContentHealthSignalKind;
  affectedEntityId: string;
  detail: string;
  evidenceRefs: string[];
}

export interface ContentHealthReport {
  entityId: string;
  state: ContentHealthState;
  freshness: FreshnessSignal;
  signals: ContentHealthSignal[];
}

export type TopicGapKind =
  | 'buying_guide'
  | 'comparison_article'
  | 'ownership_guide'
  | 'charging_topic'
  | 'editorial_links';

export type TopicGapSeverity = 'info' | 'recommended' | 'important';

export interface TopicGap {
  /** Derived topic id the gap belongs to (never a new CMS record). */
  topicId: string;
  kind: TopicGapKind;
  label: string;
  affectedEntityId: string;
  severity: TopicGapSeverity;
  suggestedAction: string;
  evidenceRefs: string[];
}

/** Page-local gaps (architecture §10.3). Corpus job stays M4. */
export interface MissingTopicReport {
  gaps: TopicGap[];
}

export type LinkAuditFindingKind =
  | 'orphan_page'
  | 'weakly_connected'
  | 'duplicate_hub_link'
  | 'duplicate_destination'
  | 'missing_evidence';

export interface LinkAuditFinding {
  kind: LinkAuditFindingKind;
  affectedEntityId: string;
  detail: string;
  evidenceRefs: string[];
  hrefs?: string[];
}

/** Reporting only — never rewrites links or article HTML. */
export interface InternalLinkAuditReport {
  /** Proven outbound suggestions considered (hub + contextual). */
  outboundCount: number;
  distinctDestinations: number;
  findings: LinkAuditFinding[];
}

/** Read-only editorial advice. Base fields locked in architecture §11.1; M3 adds reports. */
export interface EditorialRecoPack {
  suggestRelatedArticleIds: string[];
  suggestRelatedVehicleIds: string[];
  suggestRelatedBrandIds: string[];
  suggestInternalLinkTargets: LinkSuggestion[];
  missingTopics: string[];
  freshness: FreshnessSignal;
  warnings: string[];
  /** M3 */
  recommendations: EditorialRecommendation[];
  health: ContentHealthReport;
  gaps: MissingTopicReport;
  linkAudit: InternalLinkAuditReport;
}

export interface ContentIntelPageModel {
  topics: TopicMembership[];
  pillar?: PillarRef;
  clusters: ClusterRef[];
  relatedReading: RelatedReadingPlan;
  contextualLinks: LinkSuggestion[];
  hubLinks: LinkSuggestion[];
  freshness: FreshnessSignal;
  editorial?: EditorialRecoPack;
  evidenceSummary: string[];
}

/** Vehicle page CI context — all already available on vehicle-detail wire. */
export interface VehicleContentIntelContext {
  entityGraph: EntityGraph;
  brand: BrandLike;
  modelEntityId: string;
  modelHref: string;
  variants: VehicleLike[];
  selectedVariant: VehicleLike;
  /** RecommendationService order — never re-ranked by CI. */
  recommendedVehicles?: VehicleLike[] | null;
  recommendedArticles?: ArticleLike[] | null;
  /** Injectable for tests. */
  now?: IsoDateString;
}

/** Article page CI context. */
export interface ArticleContentIntelContext {
  entityGraph: EntityGraph;
  article: ArticleLike & {
    status?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    publishAt?: string | null;
    publishedAt?: string | null;
    blocks?: Array<{ type: string; data?: Record<string, unknown> }> | null;
  };
  editorialGraphResolved?: boolean;
  recommendedVehicles?: VehicleLike[] | null;
  recommendedArticles?: ArticleLike[] | null;
  brands?: BrandLike[] | null;
  now?: IsoDateString;
}

export function emptyRelatedReadingPlan(): RelatedReadingPlan {
  return {
    vehicles: [],
    articles: [],
    comparisons: []
  };
}

export function emptyFreshnessSignal(): FreshnessSignal {
  return {
    state: 'unknown',
    reasons: []
  };
}

export function emptyContentHealthReport(entityId = ''): ContentHealthReport {
  return {
    entityId,
    state: 'healthy',
    freshness: emptyFreshnessSignal(),
    signals: []
  };
}

export function emptyInternalLinkAuditReport(): InternalLinkAuditReport {
  return {
    outboundCount: 0,
    distinctDestinations: 0,
    findings: []
  };
}

/** Failure isolation contract: editorial intelligence returns this instead of throwing. */
export function emptyEditorialRecoPack(entityId = ''): EditorialRecoPack {
  return {
    suggestRelatedArticleIds: [],
    suggestRelatedVehicleIds: [],
    suggestRelatedBrandIds: [],
    suggestInternalLinkTargets: [],
    missingTopics: [],
    freshness: emptyFreshnessSignal(),
    warnings: [],
    recommendations: [],
    health: emptyContentHealthReport(entityId),
    gaps: { gaps: [] },
    linkAudit: emptyInternalLinkAuditReport()
  };
}

export function emptyContentIntelPageModel(): ContentIntelPageModel {
  return {
    topics: [],
    clusters: [],
    relatedReading: emptyRelatedReadingPlan(),
    contextualLinks: [],
    hubLinks: [],
    freshness: emptyFreshnessSignal(),
    evidenceSummary: []
  };
}
