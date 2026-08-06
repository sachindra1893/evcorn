/**
 * Phase 7.4 — Pillar / Cluster plans derived from TopicMembership.
 * No Topic/Cluster Mongo collections. Ephemeral PillarRef + ClusterRef only.
 * Pillar hrefs reuse existing public routes (brand browse, model, site hubs).
 */

import type { EntityGraph } from '../entity/entity.types';
import {
  ClusterRef,
  CONTENT_INTEL_CLUSTERS_MAX,
  CONTENT_INTEL_CONTEXTUAL_LINKS_MAX,
  LinkSuggestion,
  PillarRef,
  TopicMembership
} from './content-intel.types';

function clusterKeyFromTopic(m: TopicMembership): string | null {
  const t = m.topic;
  switch (t.kind) {
    case 'model': {
      const entityId = t.entityIds.find((id) => id.startsWith('model:')) || '';
      const key = entityId.replace(/^model:/, '') || t.id.replace(/^topic:model:/, '');
      return key ? `cluster:model:${key}` : null;
    }
    case 'brand': {
      const entityId = t.entityIds.find((id) => id.startsWith('brand:')) || '';
      const key = entityId.replace(/^brand:/, '') || t.id.replace(/^topic:brand:/, '');
      return key ? `cluster:brand:${key}` : null;
    }
    case 'facet': {
      const entityId = t.entityIds.find((id) => id.startsWith('facet:')) || '';
      const key = entityId.replace(/^facet:/, '') || t.id.replace(/^topic:facet:/, '');
      return key ? `cluster:facet:${key}` : null;
    }
    case 'article_category': {
      const key = t.id.replace(/^topic:article_category:/, '');
      if (!key || key.toLowerCase() === 'general') return null;
      return `cluster:article_category:${key}`;
    }
    default:
      return null;
  }
}

/**
 * Primary pillar for the page: prefer model → brand → articles hub → evs hub.
 * Only existing routes; never invents topic doorway URLs.
 */
export function derivePillar(
  memberships: TopicMembership[],
  opts?: { pageKind?: 'vehicle' | 'article'; modelHref?: string }
): PillarRef | undefined {
  const model = memberships.find((m) => m.topic.kind === 'model' && m.topic.href);
  if (model?.topic.href) {
    return {
      id: `pillar:model:${model.topic.id.replace(/^topic:model:/, '')}`,
      label: model.topic.label,
      href: opts?.modelHref || model.topic.href,
      topicIds: [model.topic.id]
    };
  }

  const brand = memberships.find((m) => m.topic.kind === 'brand' && m.topic.href);
  if (brand?.topic.href) {
    return {
      id: `pillar:brand:${brand.topic.id.replace(/^topic:brand:/, '')}`,
      label: brand.topic.label,
      href: brand.topic.href,
      topicIds: [brand.topic.id]
    };
  }

  if (opts?.pageKind === 'article') {
    const hub = memberships.find((m) => m.topic.id === 'topic:site_hub:articles');
    if (hub?.topic.href) {
      return {
        id: 'pillar:site_hub:articles',
        label: hub.topic.label,
        href: hub.topic.href,
        topicIds: [hub.topic.id]
      };
    }
  }

  const evs = memberships.find((m) => m.topic.id === 'topic:site_hub:evs');
  if (evs?.topic.href) {
    return {
      id: 'pillar:site_hub:evs',
      label: evs.topic.label,
      href: evs.topic.href,
      topicIds: [evs.topic.id]
    };
  }

  return undefined;
}

/**
 * Derive cluster plans from grounded topics. Members = page-local entity ids only.
 * memberSuggestions stay empty here — link-suggest fills caps with evidence.
 */
export function deriveClusters(
  memberships: TopicMembership[],
  graph: EntityGraph | null | undefined,
  opts?: { memberSuggestionsByClusterId?: Record<string, LinkSuggestion[]> }
): ClusterRef[] {
  const out: ClusterRef[] = [];
  const seen = new Set<string>();

  const ordered = [...memberships].filter(
    (m) =>
      m.topic.kind === 'model' ||
      m.topic.kind === 'brand' ||
      m.topic.kind === 'facet' ||
      m.topic.kind === 'article_category'
  );

  for (const m of ordered) {
    if (out.length >= CONTENT_INTEL_CLUSTERS_MAX) break;
    const id = clusterKeyFromTopic(m);
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const memberEntityIds = collectMemberEntityIds(m, graph);
    const suggestions = (opts?.memberSuggestionsByClusterId?.[id] || []).slice(
      0,
      CONTENT_INTEL_CONTEXTUAL_LINKS_MAX
    );

    out.push({
      id,
      label: m.topic.label,
      topicId: m.topic.id,
      memberEntityIds,
      memberSuggestions: suggestions
    });
  }

  return out;
}

function collectMemberEntityIds(
  m: TopicMembership,
  graph: EntityGraph | null | undefined
): string[] {
  const ids = new Set<string>(m.topic.entityIds);
  if (!graph?.nodes?.length) return [...ids].slice(0, 16);

  if (m.topic.kind === 'model') {
    const modelId = m.topic.entityIds.find((id) => id.startsWith('model:'));
    if (modelId) {
      for (const e of graph.edges) {
        if (e.type === 'model_has_variant' && e.from.id === modelId) {
          ids.add(e.to.id);
        }
      }
    }
  }

  if (m.topic.kind === 'brand') {
    const brandId = m.topic.entityIds.find((id) => id.startsWith('brand:'));
    if (brandId) {
      for (const e of graph.edges) {
        if (e.type === 'brand_has_model' && e.from.id === brandId) {
          ids.add(e.to.id);
        }
        if (e.type === 'article_about_brand' && e.to.id === brandId) {
          ids.add(e.from.id);
        }
      }
    }
  }

  if (m.topic.kind === 'facet') {
    const facetId = m.topic.entityIds.find((id) => id.startsWith('facet:'));
    if (facetId) {
      for (const e of graph.edges) {
        if (e.type === 'has_facet' && e.to.id === facetId) {
          ids.add(e.from.id);
        }
      }
    }
  }

  return [...ids].slice(0, 16);
}
