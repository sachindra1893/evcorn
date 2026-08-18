/**
 * Phase 7.4 — deterministic Topic Intelligence from Entity Graph + CMS facts.
 * No AI, no NLP keyword guessing as sole evidence, no invented topics/entities.
 */

import type { EntityGraph, EntityNode } from '../entity/entity.types';
import { modelEntityId } from '../entity/entity-id';
import {
  articlesIndexHref,
  brandBrowseHref,
  compareHref,
  evsIndexHref,
  faqsHref,
  modelHref
} from '../entity/entity-href';
import { normalizeArticleRelationships } from '../entity/entity-normalize';
import type { ArticleLike, BrandLike } from '../entity/entity-normalize';
import {
  CONTENT_INTEL_TOPICS_MAX,
  TopicConfidence,
  TopicKind,
  TopicMembership,
  TopicRef
} from './content-intel.types';

const WEAK_CATEGORY_IDS = new Set(['', 'general']);

function topicId(kind: TopicKind, key: string): string {
  return `topic:${kind}:${key}`;
}

function pushTopic(
  out: TopicMembership[],
  seen: Set<string>,
  membership: TopicMembership
): void {
  if (out.length >= CONTENT_INTEL_TOPICS_MAX) return;
  const id = membership.topic.id;
  if (!id || seen.has(id)) return;
  seen.add(id);
  out.push(membership);
}

function brandTopicFromNode(node: EntityNode): TopicMembership | null {
  if (node.type !== 'brand') return null;
  const rawId = node.id.replace(/^brand:/, '');
  if (!rawId) return null;
  const label = (node.name || '').trim();
  // Unresolved stubs use name===id (Entity Graph). Never invent a public brand topic from those.
  if (!label || label === rawId) return null;
  const href = node.href || brandBrowseHref(label);
  const topic: TopicRef = {
    id: topicId('brand', rawId),
    kind: 'brand',
    label,
    href,
    entityIds: [node.id]
  };
  return {
    topic,
    confidence: 'grounded',
    evidenceRefs: ['entity:brand', 'structural_entity']
  };
}

function modelTopicFromNode(node: EntityNode): TopicMembership | null {
  if (node.type !== 'model') return null;
  const key = node.id.replace(/^model:/, '');
  if (!key) return null;
  const label = (node.name || '').trim() || key;
  const topic: TopicRef = {
    id: topicId('model', key),
    kind: 'model',
    label,
    href: node.href,
    entityIds: [node.id]
  };
  return {
    topic,
    confidence: 'grounded',
    evidenceRefs: ['entity:model', 'structural_entity']
  };
}

function facetTopicFromNode(node: EntityNode): TopicMembership | null {
  if (node.type !== 'facet') return null;
  const kind =
    typeof node.attrs['facetKind'] === 'string' ? node.attrs['facetKind'] : '';
  const value =
    typeof node.attrs['value'] === 'string' ? node.attrs['value'] : node.name;
  if (!kind || !node.id.startsWith('facet:')) return null;
  const key = node.id.replace(/^facet:/, '');
  const topic: TopicRef = {
    id: topicId('facet', key),
    kind: 'facet',
    label: (value || '').trim() || key,
    entityIds: [node.id]
  };
  return {
    topic,
    confidence: 'inferred_facet',
    evidenceRefs: ['has_facet', `facetKind:${kind}`]
  };
}

function siteHub(
  key: string,
  label: string,
  href: string,
  entityIds: string[] = []
): TopicMembership {
  return {
    topic: {
      id: topicId('site_hub', key),
      kind: 'site_hub',
      label,
      href,
      entityIds
    },
    confidence: 'hub',
    evidenceRefs: ['hub_taxonomy', `site_hub:${key}`]
  };
}

function hasEnergyOrChargingEvidence(
  memberships: TopicMembership[],
  graph: EntityGraph
): boolean {
  for (const m of memberships) {
    if (m.topic.kind !== 'facet') continue;
    const id = m.topic.id.toLowerCase();
    if (id.includes('porttype') || id.includes('chemistry') || id.includes('charging')) {
      return true;
    }
  }
  for (const n of graph.nodes) {
    if (n.type !== 'facet') continue;
    const kind = String(n.attrs['facetKind'] || '').toLowerCase();
    if (kind === 'porttype' || kind === 'chemistry') return true;
  }
  return false;
}

/**
 * Derive topics from a page Entity Graph (vehicle or article).
 * Priority order matches architecture §5.2.
 */
export function deriveTopicsFromGraph(
  graph: EntityGraph | null | undefined,
  opts?: {
    pageKind?: 'vehicle' | 'article';
    article?: ArticleLike | null;
    brands?: BrandLike[] | null;
    selectedVariantId?: string | null;
  }
): TopicMembership[] {
  if (!graph?.nodes?.length) return [];

  const out: TopicMembership[] = [];
  const seen = new Set<string>();

  // 1. Brand / model nodes on page
  for (const node of graph.nodes) {
    if (node.type === 'brand') {
      const m = brandTopicFromNode(node);
      if (m) pushTopic(out, seen, m);
    }
  }
  for (const node of graph.nodes) {
    if (node.type === 'model') {
      const m = modelTopicFromNode(node);
      if (m) pushTopic(out, seen, m);
    }
  }

  // 2. Facet edges on selected variant / model
  const facetHosts = new Set<string>();
  for (const e of graph.edges) {
    if (e.type !== 'has_facet') continue;
    facetHosts.add(e.from.id);
    const facet = graph.nodes.find((n) => n.id === e.to.id);
    if (!facet) continue;
    const m = facetTopicFromNode(facet);
    if (m) pushTopic(out, seen, m);
  }

  // 3. Article relationships — resolved brand/model entities only
  if (opts?.article) {
    const rel = normalizeArticleRelationships(opts.article.relationships);
    const brandById = new Map<string, BrandLike>();
    for (const b of opts.brands || []) {
      if (b?.id) brandById.set(b.id.trim(), b);
    }

    for (const brandId of rel.relatedBrandIds) {
      const node = graph.nodes.find((n) => n.id === `brand:${brandId}`);
      if (node) {
        const m = brandTopicFromNode(node);
        if (m) {
          m.evidenceRefs = ['relationships.relatedBrandIds', 'editorial_relationship'];
          pushTopic(out, seen, m);
        }
        continue;
      }
      const dto = brandById.get(brandId);
      if (!dto?.name?.trim()) continue; // unresolved → discard (never invent)
      const label = dto.name.trim();
      pushTopic(out, seen, {
        topic: {
          id: topicId('brand', brandId),
          kind: 'brand',
          label,
          href: brandBrowseHref(label),
          entityIds: [`brand:${brandId}`]
        },
        confidence: 'grounded',
        evidenceRefs: ['relationships.relatedBrandIds', 'editorial_relationship']
      });
    }

    // Model topics from model nodes, or from resolved variant nodes (article graphs omit virtual models)
    for (const node of graph.nodes) {
      if (node.type === 'model') {
        const m = modelTopicFromNode(node);
        if (!m) continue;
        const hasEditorialVehicle = graph.edges.some((e) => e.type === 'article_about_vehicle');
        m.evidenceRefs = hasEditorialVehicle
          ? ['relationships.relatedVehicleIds', 'editorial_relationship']
          : ['recommended_vehicle', 'recommendation'];
        pushTopic(out, seen, m);
        continue;
      }
      if (node.type !== 'variant') continue;
      const parentModel =
        typeof node.attrs['parentModel'] === 'string' ? node.attrs['parentModel'].trim() : '';
      const categoryId =
        typeof node.attrs['categoryId'] === 'string' ? node.attrs['categoryId'].trim() : '';
      const brandName =
        typeof node.attrs['brandName'] === 'string' ? node.attrs['brandName'].trim() : '';
      if (!parentModel || !categoryId) continue;
      const mid = modelEntityId(categoryId, { parentModel });
      if (!mid) continue;
      const key = mid.replace(/^model:/, '');
      const href =
        node.href ||
        modelHref({ brandName: brandName || undefined, brandSlug: categoryId, parentModel });
      const hasEditorialVehicle = graph.edges.some(
        (e) => e.type === 'article_about_vehicle' && e.to.id === node.id
      );
      pushTopic(out, seen, {
        topic: {
          id: topicId('model', key),
          kind: 'model',
          label: parentModel,
          href,
          entityIds: [mid, node.id]
        },
        confidence: 'grounded',
        evidenceRefs: hasEditorialVehicle
          ? ['relationships.relatedVehicleIds', 'editorial_relationship']
          : ['recommended_vehicle', 'recommendation']
      });
    }

    // 4. Article categoryId (weak; skip general/empty)
    const categoryId = (opts.article.categoryId || '').trim();
    if (categoryId && !WEAK_CATEGORY_IDS.has(categoryId.toLowerCase())) {
      pushTopic(out, seen, {
        topic: {
          id: topicId('article_category', categoryId),
          kind: 'article_category',
          label: categoryId,
          entityIds: [],
          href: undefined
        },
        confidence: 'weak_category',
        evidenceRefs: ['article.categoryId']
      });
    }
  }

  // 5. Site hubs — only with page-kind / facet evidence
  const pageKind = opts?.pageKind || (opts?.article ? 'article' : 'vehicle');
  if (pageKind === 'vehicle') {
    pushTopic(out, seen, siteHub('evs', 'Browse EVs', evsIndexHref()));
    const variantId = (opts?.selectedVariantId || '').trim();
    if (variantId) {
      pushTopic(
        out,
        seen,
        siteHub('compare', 'Compare', compareHref([variantId]), [`variant:${variantId}`])
      );
    } else {
      pushTopic(out, seen, siteHub('compare', 'Compare', compareHref([])));
    }
  } else {
    pushTopic(out, seen, siteHub('articles', 'Articles', articlesIndexHref()));
    pushTopic(out, seen, siteHub('faqs', 'FAQs', faqsHref()));
  }

  void facetHosts; // used for grounding; topics already emitted from facet nodes
  return out.slice(0, CONTENT_INTEL_TOPICS_MAX);
}

/** Confidence sort key for suggestion ordering (not ML). */
export function topicConfidenceRank(c: TopicConfidence): number {
  switch (c) {
    case 'grounded':
      return 0;
    case 'inferred_facet':
      return 1;
    case 'weak_category':
      return 2;
    case 'hub':
      return 3;
    default:
      return 9;
  }
}
