/**
 * Phase 7.4 — LinkSuggestion canonicality (pure).
 * One suggestion per stable targetEntityId; merge evidence; preserve order.
 */

import {
  CONTENT_INTEL_CONTEXTUAL_LINKS_MAX,
  LinkEvidence,
  LinkEvidenceSource,
  LinkSuggestion
} from './content-intel.types';

const EVIDENCE_SOURCE_RANK: Record<LinkEvidenceSource, number> = {
  editorial_relationship: 0,
  related_block: 1,
  recommendation: 2,
  structural_entity: 3,
  facet_membership: 4,
  shared_entity: 5,
  hub_taxonomy: 6,
  freshness_rule: 7
};

/**
 * Destination identity for on-page dedupe.
 * Query strings are load-bearing (`/evs?category=`, `/compare?ids=`) — keep them; drop fragment.
 */
export function normalizeDestinationHref(href: string | undefined | null): string {
  const trimmed = (href || '').trim().split('#')[0];
  if (trimmed.length > 1 && trimmed.endsWith('/')) return trimmed.slice(0, -1);
  return trimmed;
}

export function isValidLinkSuggestion(
  s: LinkSuggestion | null | undefined
): s is LinkSuggestion {
  return !!(
    s &&
    s.label?.trim() &&
    s.href?.trim() &&
    s.targetEntityId?.trim() &&
    s.evidence?.source &&
    Array.isArray(s.evidence.refs) &&
    s.evidence.refs.length > 0
  );
}

/** Merge evidence for the same canonical entity — union refs; prefer stronger source. */
export function mergeLinkEvidence(a: LinkEvidence, b: LinkEvidence): LinkEvidence {
  const refs: string[] = [];
  const seen = new Set<string>();
  for (const r of [...a.refs, ...b.refs]) {
    const t = (r || '').trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    refs.push(t);
  }
  const rankA = EVIDENCE_SOURCE_RANK[a.source] ?? 99;
  const rankB = EVIDENCE_SOURCE_RANK[b.source] ?? 99;
  const source = rankB < rankA ? b.source : a.source;
  if (a.source !== b.source) {
    const other = source === a.source ? b.source : a.source;
    const tag = `source:${other}`;
    if (!seen.has(tag)) {
      seen.add(tag);
      refs.push(tag);
    }
  }
  return { source, refs };
}

/**
 * Canonicalize LinkSuggestions:
 * - Require exactly one targetEntityId per suggestion
 * - Deduplicate by stable entityId (not URL)
 * - Merge evidence when the same entity appears more than once
 * - Preserve first-seen order; optionally reorder by RecommendationService entity ids
 * - Cap ≤ CONTENT_INTEL_CONTEXTUAL_LINKS_MAX
 */
export function canonicalLinkSuggestions(
  suggestions: LinkSuggestion[],
  orderEntityIds?: Iterable<string>
): LinkSuggestion[] {
  const byEntity = new Map<string, LinkSuggestion>();
  const order: string[] = [];

  for (const raw of suggestions || []) {
    if (!isValidLinkSuggestion(raw)) continue;
    const entityId = raw.targetEntityId.trim();
    const existing = byEntity.get(entityId);
    if (!existing) {
      const copy: LinkSuggestion = {
        ...raw,
        targetEntityId: entityId,
        evidence: {
          source: raw.evidence.source,
          refs: [...raw.evidence.refs]
        }
      };
      byEntity.set(entityId, copy);
      order.push(entityId);
      continue;
    }
    existing.evidence = mergeLinkEvidence(existing.evidence, raw.evidence);
    if (raw.weight != null && existing.weight == null) {
      existing.weight = raw.weight;
    }
  }

  let orderedIds = order;
  if (orderEntityIds) {
    const preferred: string[] = [];
    const seen = new Set<string>();
    for (const id of orderEntityIds) {
      const key = (id || '').trim();
      if (!key || seen.has(key) || !byEntity.has(key)) continue;
      seen.add(key);
      preferred.push(key);
    }
    for (const id of order) {
      if (seen.has(id)) continue;
      seen.add(id);
      preferred.push(id);
    }
    orderedIds = preferred;
  }

  return orderedIds
    .map((id) => byEntity.get(id)!)
    .slice(0, CONTENT_INTEL_CONTEXTUAL_LINKS_MAX);
}

/** Stable compare target from entity-href compare URL (`/compare?ids=…`). */
export function compareTargetEntityId(href: string): string {
  const raw = (href || '').trim();
  if (!raw) return '';
  const qIndex = raw.indexOf('?');
  if (qIndex >= 0) {
    const params = new URLSearchParams(raw.slice(qIndex + 1));
    const ids = (params.get('ids') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length) return `compare:${ids.join(':')}`;
  }
  return `compare:${raw}`;
}
