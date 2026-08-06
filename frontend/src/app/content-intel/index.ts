export type {
  ArticleContentIntelContext,
  ClusterRef,
  ContentHealthReport,
  ContentHealthSignal,
  ContentHealthSignalKind,
  ContentHealthState,
  ContentIntelPageModel,
  EditorialConfidence,
  EditorialFreshnessPriority,
  EditorialRecoKind,
  EditorialRecoPack,
  EditorialRecommendation,
  FreshnessSignal,
  FreshnessState,
  InternalLinkAuditReport,
  IsoDateString,
  LinkAuditFinding,
  LinkAuditFindingKind,
  LinkEvidence,
  LinkEvidenceSource,
  LinkRelKind,
  LinkSuggestion,
  MissingTopicReport,
  PillarRef,
  RelatedReadingItemArticle,
  RelatedReadingItemComparison,
  RelatedReadingItemVehicle,
  RelatedReadingPlan,
  TopicConfidence,
  TopicGap,
  TopicGapKind,
  TopicGapSeverity,
  TopicKind,
  TopicMembership,
  TopicRef,
  VehicleContentIntelContext
} from './content-intel.types';

export {
  CONTENT_INTEL_CLUSTERS_MAX,
  CONTENT_INTEL_COMPARISONS_MAX,
  CONTENT_INTEL_CONTEXTUAL_LINKS_MAX,
  CONTENT_INTEL_RELATED_ARTICLES_MAX,
  CONTENT_INTEL_RELATED_VEHICLES_MAX,
  CONTENT_INTEL_TOPICS_MAX,
  EDITORIAL_LINK_FINDINGS_MAX,
  EDITORIAL_RECOMMENDATIONS_MAX,
  EDITORIAL_SUGGEST_BRANDS_MAX,
  EDITORIAL_TOPIC_GAPS_MAX,
  EDITORIAL_WARNINGS_MAX,
  WEAK_CONNECTION_MIN_DESTINATIONS,
  emptyContentHealthReport,
  emptyContentIntelPageModel,
  emptyEditorialRecoPack,
  emptyFreshnessSignal,
  emptyInternalLinkAuditReport,
  emptyRelatedReadingPlan
} from './content-intel.types';

export { deriveContentHealth } from './content-health';
export type { ContentHealthInput } from './content-health';
export { detectMissingTopics } from './topic-gap';
export type { TopicGapInput } from './topic-gap';
export { auditInternalLinks } from './link-audit';
export type { LinkAuditInput } from './link-audit';
export { buildEditorialRecoPack, safeBuildEditorialRecoPack } from './editorial-pack';
export type { EditorialPackContext } from './editorial-pack';

export {
  buildArticleContentIntel,
  buildVehicleContentIntel,
  safeBuildArticleContentIntel,
  safeBuildVehicleContentIntel
} from './content-intel-engine';

export {
  CONTENT_INTEL_CACHE_MAX_ENTRIES,
  clearContentIntelCache,
  contentIntelCacheKey,
  contentIntelCacheSize,
  getCachedContentIntel,
  setCachedContentIntel
} from './content-intel-cache';

export { deriveTopicsFromGraph, topicConfidenceRank } from './topic-derive';
export { deriveClusters, derivePillar } from './pillar-cluster';
export {
  buildRelatedReadingPlan,
  linkSuggestionsFromRelatedReading,
  reasonFromEvidence,
  sharedTopicLabels
} from './related-reading';
export {
  canonicalLinkSuggestions,
  compareTargetEntityId,
  mergeLinkEvidence,
  normalizeDestinationHref
} from './link-canonical';
export {
  brandHubSuggestion,
  filterProvenLinkSuggestions,
  suggestContextualLinks,
  suggestHubLinks
} from './link-suggest';
export {
  FRESHNESS_AGING_MAX_DAYS,
  FRESHNESS_FRESH_MAX_DAYS,
  deriveFreshness,
  deriveVehicleFreshness
} from './freshness';

export {
  EXPLORE_LINKS_MAX,
  buildTopicNav,
  exploreLinksForPage,
  mergeExploreLinks,
  relatedReadingLabelMap
} from './page-nav';
export type {
  ExploreLink,
  RelatedItemLabel,
  RelatedReadingLabelMap,
  TopicNavItem
} from './page-nav';
