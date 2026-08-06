/**
 * Phase 7.4 M2 — page navigation helpers (pure).
 * Merge CI hub links into existing Explore / Internal Links; label Related* without duplicating lists;
 * surface evidence-backed topic/pillar navigation only.
 * Never rewrites HTML / article body. Never re-ranks RecommendationService.
 */

import type {
  ContentIntelPageModel,
  LinkSuggestion,
  RelatedReadingPlan
} from './content-intel.types';
import { normalizeDestinationHref } from './link-canonical';

/** Match AEO `generateInternalLinks` cap — one Explore system. */
export const EXPLORE_LINKS_MAX = 8;

export interface ExploreLink {
  label: string;
  href: string;
}

export interface RelatedItemLabel {
  topicLabels: string[];
  reason?: string;
}

export interface RelatedReadingLabelMap {
  vehicles: Record<string, RelatedItemLabel>;
  articles: Record<string, RelatedItemLabel>;
}

export interface TopicNavItem {
  label: string;
  href: string;
  kind: 'pillar' | 'topic' | 'cluster';
  /** Non-empty — required for public topic nav. */
  evidenceRefs: string[];
}

/** Shared destination identity — same key AEO `generateInternalLinks` dedupes on. */
const normalizeHref = normalizeDestinationHref;

/**
 * Extend AEO Internal Links with evidence-backed CI hub suggestions.
 * Preserves AEO order; appends novel hubs only; caps destinations; excludes Related* hrefs.
 * Does not create a second internal-link system.
 */
export function mergeExploreLinks(
  aeoInternalLinks: ExploreLink[] | null | undefined,
  hubLinks: LinkSuggestion[] | null | undefined,
  opts?: {
    /** Destinations already shown in Related Vehicles / Articles / Comparisons. */
    excludeHrefs?: Iterable<string>;
    max?: number;
  }
): ExploreLink[] {
  const max = opts?.max ?? EXPLORE_LINKS_MAX;
  const excluded = new Set<string>();
  for (const h of opts?.excludeHrefs || []) {
    const n = normalizeHref(h);
    if (n) excluded.add(n);
  }

  const seen = new Set<string>();
  const out: ExploreLink[] = [];

  const push = (label: string, href: string) => {
    const trimmedLabel = (label || '').trim();
    const trimmedHref = (href || '').trim();
    if (!trimmedLabel || !trimmedHref) return;
    const key = normalizeHref(trimmedHref) || trimmedHref;
    if (seen.has(key) || excluded.has(key) || out.length >= max) return;
    seen.add(key);
    out.push({ label: trimmedLabel, href: trimmedHref });
  };

  for (const link of aeoInternalLinks || []) {
    push(link.label, link.href);
  }

  for (const hub of hubLinks || []) {
    if (hub.relKind !== 'hub') continue;
    if (!hub.evidence?.refs?.length) continue;
    if (!(hub.targetEntityId || '').trim()) continue;
    push(hub.label, hub.href);
  }

  return out;
}

/** Labels for existing Related* rows — lookup only; never a second Related list. */
export function relatedReadingLabelMap(
  plan: RelatedReadingPlan | null | undefined
): RelatedReadingLabelMap {
  const vehicles: Record<string, RelatedItemLabel> = {};
  const articles: Record<string, RelatedItemLabel> = {};
  if (!plan) return { vehicles, articles };

  for (const row of plan.vehicles || []) {
    const id = (row.item?.id || '').trim();
    if (!id) continue;
    vehicles[id] = {
      topicLabels: [...(row.topicLabels || [])],
      reason: row.reason
    };
  }
  for (const row of plan.articles || []) {
    const id = (row.item?.id || '').trim();
    if (!id) continue;
    articles[id] = {
      topicLabels: [...(row.topicLabels || [])],
      reason: row.reason
    };
  }
  return { vehicles, articles };
}

/**
 * Topic / pillar / cluster navigation — only items with real href + evidence.
 * No placeholder topics; labels come from derived TopicRef / PillarRef only.
 */
export function buildTopicNav(
  model: ContentIntelPageModel | null | undefined,
  opts?: {
    /** Destinations already shown in Related* / Explore — prefer those sections. */
    excludeHrefs?: Iterable<string>;
  }
): TopicNavItem[] {
  if (!model) return [];
  const out: TopicNavItem[] = [];
  const seenHref = new Set<string>();
  for (const h of opts?.excludeHrefs || []) {
    const n = normalizeHref(h);
    if (n) seenHref.add(n);
  }

  const push = (item: TopicNavItem) => {
    const href = (item.href || '').trim();
    const label = (item.label || '').trim();
    if (!href || !label || !item.evidenceRefs.length) return;
    const key = normalizeHref(href) || href;
    if (seenHref.has(key)) return;
    seenHref.add(key);
    out.push({
      label,
      href,
      kind: item.kind,
      evidenceRefs: [...item.evidenceRefs]
    });
  };

  if (model.pillar?.href && model.pillar.topicIds.length) {
    push({
      label: model.pillar.label,
      href: model.pillar.href,
      kind: 'pillar',
      evidenceRefs: model.pillar.topicIds.map((id) => `pillar:${id}`)
    });
  }

  for (const m of model.topics || []) {
    if (!m.topic.href || !m.evidenceRefs.length) continue;
    push({
      label: m.topic.label,
      href: m.topic.href,
      kind: 'topic',
      evidenceRefs: [...m.evidenceRefs]
    });
  }

  // Clusters: navigate via their topic hub when that topic has a real href.
  const topicById = new Map((model.topics || []).map((t) => [t.topic.id, t]));
  for (const c of model.clusters || []) {
    if (!c.memberEntityIds.length && !c.memberSuggestions.length) continue;
    const membership = topicById.get(c.topicId);
    const href = membership?.topic.href;
    if (!href || !membership.evidenceRefs.length) continue;
    push({
      label: c.label,
      href,
      kind: 'cluster',
      evidenceRefs: [
        `cluster:${c.id}`,
        ...membership.evidenceRefs.slice(0, 2)
      ]
    });
  }

  return out;
}

/**
 * Failure-isolated Explore list: on empty/missing CI hubs, keep AEO Internal Links as-is.
 */
export function exploreLinksForPage(
  aeoInternalLinks: ExploreLink[] | null | undefined,
  hubLinks: LinkSuggestion[] | null | undefined,
  relatedHrefs?: Iterable<string>
): ExploreLink[] {
  try {
    return mergeExploreLinks(aeoInternalLinks, hubLinks, {
      excludeHrefs: relatedHrefs
    });
  } catch {
    return [...(aeoInternalLinks || [])].slice(0, EXPLORE_LINKS_MAX);
  }
}
