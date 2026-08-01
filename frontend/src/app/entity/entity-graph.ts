/**
 * Phase 7.3 M2 — page-scoped Entity Graphs.
 * Pure / derived only. Never ranks, scores, or replaces RecommendationService.
 * Complexity: O(page-local + capped related). Never scans a catalog.
 */

import { getCachedEntityGraph, setCachedEntityGraph } from './entity-cache';
import {
  articleEntityId,
  authorEntityId,
  modelEntityId,
  variantEntityId
} from './entity-id';
import { articleHref, compareHref, faqsHref, modelHref } from './entity-href';
import {
  ArticleLike,
  BrandLike,
  normalizeArticleNode,
  normalizeArticleRelationships,
  normalizeBrandNode,
  normalizeModelNode,
  normalizeVariantNode,
  VehicleLike
} from './entity-normalize';
import { entitySlugify } from './entity-slug';
import {
  ENTITY_COMPARE_EDGES_MAX,
  ENTITY_RELATED_ARTICLES_MAX,
  ENTITY_RELATED_VEHICLES_MAX,
  EntityEdge,
  EntityGraph,
  EntityNode
} from './entity.types';

export const EMPTY_ENTITY_GRAPH: EntityGraph = Object.freeze({
  nodes: [],
  edges: []
}) as EntityGraph;

export interface VehiclePageGraphContext {
  brand: BrandLike;
  /** Sibling variants already loaded for this model page — never the full catalog. */
  variants: VehicleLike[];
  selectedVariant?: VehicleLike | null;
  /** Pre-ranked RecommendationService slate — order preserved. */
  recommendedVehicles?: VehicleLike[] | null;
  recommendedArticles?: ArticleLike[] | null;
}

export interface ArticleBlockLike {
  type: string;
  data?: Record<string, unknown>;
}

export interface ArticlePageGraphContext {
  article: ArticleLike & { blocks?: ArticleBlockLike[] | null };
  /** Optional brand DTOs for resolving relatedBrandIds (e.g. categories on page). */
  brands?: BrandLike[] | null;
  /**
   * Resolved editorial vehicles in editorial id order (stubs allowed).
   * When non-empty, outbound related vehicles use these — not recommendations.
   */
  editorialVehicles?: VehicleLike[] | null;
  /** Resolved editorial articles in editorial id order. */
  editorialArticles?: ArticleLike[] | null;
  /** RecommendationService slate — used only when editorial vehicles absent. */
  recommendedVehicles?: VehicleLike[] | null;
  /** RecommendationService slate — used only when editorial articles absent. */
  recommendedArticles?: ArticleLike[] | null;
}

/** Light AEO-facing vehicle row derived from graph edges (href via entity-href). */
export interface GraphRelatedVehicle {
  id: string;
  name: string;
  href: string;
  parentModel?: string;
  variantName?: string;
  brandName?: string;
  brandSlug?: string;
  modelSlug?: string;
  categoryId?: string;
}

/** Light AEO-facing article row derived from graph edges. */
export interface GraphRelatedArticle {
  id: string;
  title: string;
  href: string;
}

export interface GraphRelatedComparison {
  label: string;
  href: string;
}

type FacetVehicle = VehicleLike & {
  battery?: { chemistry?: string | null } | null;
  charging?: { portType?: string | null } | null;
  performance?: { drivetrain?: string | null } | null;
  drivetrain?: string | null;
};

function pushNode(nodes: EntityNode[], byId: Map<string, EntityNode>, node: EntityNode | null): void {
  if (!node || byId.has(node.id)) return;
  byId.set(node.id, node);
  nodes.push(node);
}

function edge(
  type: EntityEdge['type'],
  from: EntityNode,
  to: EntityNode,
  source: EntityEdge['source'],
  href?: string
): EntityEdge {
  return {
    type,
    from: { type: from.type, id: from.id },
    to: { type: to.type, id: to.id },
    href,
    source
  };
}

function imageNode(url: string): EntityNode | null {
  const trimmed = (url || '').trim();
  if (!trimmed || trimmed === 'N/A') return null;
  return {
    type: 'image',
    id: `image:${trimmed}`,
    name: 'Image',
    attrs: {},
    imageUrl: trimmed
  };
}

function facetNode(kind: string, value: string): EntityNode | null {
  const v = (value || '').trim();
  if (!v || v === 'N/A') return null;
  const key = entitySlugify(v);
  if (!key) return null;
  return {
    type: 'facet',
    id: `facet:${kind}:${key}`,
    name: v,
    attrs: { facetKind: kind, value: v }
  };
}

function authorNode(author: ArticleLike['author']): EntityNode | null {
  const name =
    typeof author === 'string'
      ? author.trim()
      : (author?.name || '').trim();
  const id = authorEntityId(name);
  if (!id || !name) return null;
  return {
    type: 'author',
    id,
    name,
    attrs: omitEmpty({
      role: typeof author === 'object' && author ? (author as { role?: string }).role : undefined
    })
  };
}

function faqSetNode(pageHref: string): EntityNode | null {
  const href = (pageHref || '').trim();
  if (!href) return null;
  return {
    type: 'faqSet',
    id: `faqSet:${href}`,
    name: 'FAQ',
    href,
    attrs: {}
  };
}

function omitEmpty(attrs: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === '' || v === 'N/A') continue;
    out[k] = v;
  }
  return out;
}

function attachImage(
  nodes: EntityNode[],
  byId: Map<string, EntityNode>,
  edges: EntityEdge[],
  host: EntityNode,
  url: string | null | undefined
): void {
  const img = imageNode(url || '');
  if (!img) return;
  pushNode(nodes, byId, img);
  edges.push(edge('has_image', host, img, 'derived', undefined));
}

function attachFacets(
  nodes: EntityNode[],
  byId: Map<string, EntityNode>,
  edges: EntityEdge[],
  host: EntityNode,
  vehicle: FacetVehicle | null | undefined
): void {
  if (!vehicle) return;
  const candidates: Array<[string, string | null | undefined]> = [
    ['bodyStyle', vehicle.bodyStyle],
    ['chemistry', vehicle.battery?.chemistry],
    ['portType', vehicle.charging?.portType],
    ['drivetrain', vehicle.performance?.drivetrain || vehicle.drivetrain]
  ];
  for (const [kind, value] of candidates) {
    const node = facetNode(kind, value || '');
    if (!node) continue;
    pushNode(nodes, byId, node);
    edges.push(edge('has_facet', host, node, 'derived'));
  }
}

function stubVariantNode(vehicleId: string): EntityNode | null {
  const id = variantEntityId(vehicleId);
  if (!id) return null;
  const href = compareHref([vehicleId]);
  return {
    type: 'variant',
    id,
    name: 'Related EV',
    href,
    attrs: {},
    aliases: [vehicleId.trim()]
  };
}

function stubArticleNode(articleId: string): EntityNode | null {
  const trimmed = (articleId || '').trim();
  if (!trimmed) return null;
  const href = articleHref(trimmed);
  return {
    type: 'article',
    id: `article:${trimmed}`,
    name: 'Related article',
    href,
    attrs: {},
    aliases: [trimmed]
  };
}

function stubBrandNode(brandId: string): EntityNode | null {
  const trimmed = (brandId || '').trim();
  if (!trimmed) return null;
  return {
    type: 'brand',
    id: `brand:${trimmed}`,
    name: trimmed,
    href: undefined,
    attrs: {},
    aliases: [trimmed]
  };
}

function collectRelatedArticleIdsFromBlocks(
  relationshipIds: string[],
  blocks: ArticleBlockLike[] | null | undefined
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const id of relationshipIds) {
    const t = id.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    ids.push(t);
  }
  for (const block of blocks || []) {
    if (block.type !== 'related') continue;
    const raw = block.data?.['articleIds'];
    if (!Array.isArray(raw)) continue;
    for (const id of raw) {
      if (typeof id !== 'string') continue;
      const t = id.trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      ids.push(t);
    }
  }
  return ids;
}

/**
 * Page-scoped vehicle graph: brand ↔ model ↔ variants + recommendation edges.
 * Does not fetch or scan beyond `ctx.variants` + capped recommended arrays.
 */
export function buildVehiclePageGraph(ctx: VehiclePageGraphContext): EntityGraph {
  const nodes: EntityNode[] = [];
  const edges: EntityEdge[] = [];
  const byId = new Map<string, EntityNode>();

  const brand = normalizeBrandNode(ctx.brand);
  if (!brand) return { nodes, edges };

  pushNode(nodes, byId, brand);

  const variants = Array.isArray(ctx.variants) ? ctx.variants : [];
  const selected =
    ctx.selectedVariant ||
    variants.find((v) => v?.id) ||
    variants[0] ||
    null;

  const brandId = (ctx.brand.id || selected?.categoryId || '').trim();
  const model = normalizeModelNode(brandId, selected || variants[0], {
    brandName: ctx.brand.name
  });
  if (!model) return { nodes, edges };

  pushNode(nodes, byId, model);
  edges.push(edge('brand_has_model', brand, model, 'structural', model.href));

  let selectedNode: EntityNode | null = null;
  const variantNodes: EntityNode[] = [];

  for (const v of variants) {
    const node = normalizeVariantNode({
      ...v,
      brandName: v.brandName || ctx.brand.name,
      brandSlug: v.brandSlug || entitySlugify(ctx.brand.name || '')
    });
    if (!node) continue;
    pushNode(nodes, byId, node);
    variantNodes.push(node);
    edges.push(edge('model_has_variant', model, node, 'structural', node.href));
    if (selected?.id && v.id === selected.id) selectedNode = node;
  }

  if (!selectedNode && selected) {
    selectedNode = normalizeVariantNode({
      ...selected,
      brandName: selected.brandName || ctx.brand.name,
      brandSlug: selected.brandSlug || entitySlugify(ctx.brand.name || '')
    });
    if (selectedNode) {
      pushNode(nodes, byId, selectedNode);
      edges.push(edge('model_has_variant', model, selectedNode, 'structural', selectedNode.href));
      variantNodes.push(selectedNode);
    }
  }

  if (selectedNode) {
    for (const sibling of variantNodes) {
      if (sibling.id === selectedNode.id) continue;
      edges.push(edge('variant_sibling', selectedNode, sibling, 'structural', sibling.href));
    }
    attachImage(nodes, byId, edges, selectedNode, selected?.imageUrl);
    attachFacets(nodes, byId, edges, selectedNode, selected as FacetVehicle);
    attachFacets(nodes, byId, edges, model, selected as FacetVehicle);
  }

  // Recommendation edges — order preserved from RecommendationService; cap only.
  const recVehicles = Array.isArray(ctx.recommendedVehicles) ? ctx.recommendedVehicles : [];
  let vehicleEdges = 0;
  for (const rv of recVehicles) {
    if (vehicleEdges >= ENTITY_RELATED_VEHICLES_MAX) break;
    const node = normalizeVariantNode(rv) || stubVariantNode((rv.id || '').trim());
    if (!node) continue;
    pushNode(nodes, byId, node);
    const href =
      node.href ||
      modelHref({
        brandName: rv.brandName,
        brandSlug: rv.brandSlug || rv.categoryId,
        parentModel: rv.parentModel,
        name: rv.name,
        modelSlug: rv.modelSlug
      }) ||
      (rv.id ? compareHref([rv.id]) : undefined);
    edges.push(edge('recommended_vehicle', model, node, 'recommendation', href));
    vehicleEdges++;
  }

  const recArticles = Array.isArray(ctx.recommendedArticles) ? ctx.recommendedArticles : [];
  let articleEdges = 0;
  for (const ra of recArticles) {
    if (articleEdges >= ENTITY_RELATED_ARTICLES_MAX) break;
    const node = normalizeArticleNode(ra) || stubArticleNode((ra.id || '').trim());
    if (!node) continue;
    pushNode(nodes, byId, node);
    edges.push(edge('recommended_article', model, node, 'recommendation', node.href));
    articleEdges++;
  }

  // compares_with — selected vs first capped peers from recommendation slate (AEO align).
  if (selectedNode) {
    let compares = 0;
    for (const rv of recVehicles) {
      if (compares >= ENTITY_COMPARE_EDGES_MAX) break;
      const peerId = (rv.id || '').trim();
      if (!peerId || peerId === selected?.id) continue;
      const peer =
        byId.get(variantEntityId(peerId)) ||
        normalizeVariantNode(rv) ||
        stubVariantNode(peerId);
      if (!peer) continue;
      pushNode(nodes, byId, peer);
      const href = compareHref([selected?.id, peerId]);
      edges.push(edge('compares_with', selectedNode, peer, 'derived', href));
      compares++;
    }
  }

  const pageHref = model.href;
  const faq = faqSetNode(pageHref || faqsHref());
  if (faq) {
    pushNode(nodes, byId, faq);
    edges.push(edge('faq_about', faq, model, 'derived', model.href));
  }

  return { nodes, edges };
}

/**
 * Page-scoped article graph. Editorial relationships win; recommendations
 * only fill outbound related when editorial lists are empty (per type).
 */
export function buildArticlePageGraph(ctx: ArticlePageGraphContext): EntityGraph {
  const nodes: EntityNode[] = [];
  const edges: EntityEdge[] = [];
  const byId = new Map<string, EntityNode>();

  const article = normalizeArticleNode(ctx.article);
  if (!article) return { nodes, edges };
  pushNode(nodes, byId, article);

  const author = authorNode(ctx.article.author);
  if (author) {
    pushNode(nodes, byId, author);
    edges.push(edge('authored_by', article, author, 'editorial'));
  }

  attachImage(nodes, byId, edges, article, ctx.article.imageUrl);

  const rel = normalizeArticleRelationships(ctx.article.relationships);
  const editorialArticleIds = collectRelatedArticleIdsFromBlocks(
    rel.relatedArticleIds,
    ctx.article.blocks
  );

  const brandById = new Map<string, BrandLike>();
  for (const b of ctx.brands || []) {
    if (b?.id) brandById.set(String(b.id).trim(), b);
  }

  for (const brandId of rel.relatedBrandIds) {
    const resolved = brandById.get(brandId);
    const brand = normalizeBrandNode(resolved || { id: brandId, name: brandId }) || stubBrandNode(brandId);
    if (!brand) continue;
    pushNode(nodes, byId, brand);
    edges.push(edge('article_about_brand', article, brand, 'editorial', brand.href));
  }

  const editorialVehicles = Array.isArray(ctx.editorialVehicles) ? ctx.editorialVehicles : [];
  const editorialArticles = Array.isArray(ctx.editorialArticles) ? ctx.editorialArticles : [];

  // Prefer explicit editorial vehicle DTOs; else stub from relationship ids.
  const vehicleSources: VehicleLike[] =
    editorialVehicles.length > 0
      ? editorialVehicles
      : rel.relatedVehicleIds.map((id) => ({ id }));

  const hasEditorialVehicles = vehicleSources.length > 0 && (
    editorialVehicles.length > 0 || rel.relatedVehicleIds.length > 0
  );

  if (hasEditorialVehicles) {
    let count = 0;
    for (const v of vehicleSources) {
      if (count >= ENTITY_RELATED_VEHICLES_MAX) break;
      const node = normalizeVariantNode(v) || stubVariantNode((v.id || '').trim());
      if (!node) continue;
      pushNode(nodes, byId, node);
      edges.push(edge('article_about_vehicle', article, node, 'editorial', node.href));
      count++;
    }
  } else {
    const recVehicles = Array.isArray(ctx.recommendedVehicles) ? ctx.recommendedVehicles : [];
    let count = 0;
    for (const v of recVehicles) {
      if (count >= ENTITY_RELATED_VEHICLES_MAX) break;
      const node = normalizeVariantNode(v) || stubVariantNode((v.id || '').trim());
      if (!node) continue;
      pushNode(nodes, byId, node);
      const href =
        node.href ||
        modelHref({
          brandName: v.brandName,
          brandSlug: v.brandSlug || v.categoryId,
          parentModel: v.parentModel,
          name: v.name,
          modelSlug: v.modelSlug
        }) ||
        (v.id ? compareHref([v.id]) : undefined);
      edges.push(edge('recommended_vehicle', article, node, 'recommendation', href));
      count++;
    }
  }

  const hasEditorialArticles =
    editorialArticles.length > 0 || editorialArticleIds.length > 0;

  if (hasEditorialArticles) {
    const articleSources: ArticleLike[] =
      editorialArticles.length > 0
        ? editorialArticles
        : editorialArticleIds.map((id) => ({ id, title: 'Related article' }));
    let count = 0;
    for (const a of articleSources) {
      if (count >= ENTITY_RELATED_ARTICLES_MAX) break;
      if (a.id && article.id === `article:${a.id}`) continue;
      const node = normalizeArticleNode(a) || stubArticleNode((a.id || '').trim());
      if (!node || node.id === article.id) continue;
      pushNode(nodes, byId, node);
      edges.push(edge('article_related_article', article, node, 'editorial', node.href));
      count++;
    }
  } else {
    const recArticles = Array.isArray(ctx.recommendedArticles) ? ctx.recommendedArticles : [];
    let count = 0;
    for (const a of recArticles) {
      if (count >= ENTITY_RELATED_ARTICLES_MAX) break;
      const node = normalizeArticleNode(a) || stubArticleNode((a.id || '').trim());
      if (!node || node.id === article.id) continue;
      pushNode(nodes, byId, node);
      edges.push(edge('recommended_article', article, node, 'recommendation', node.href));
      count++;
    }
  }

  const faq = faqSetNode(article.href || faqsHref());
  if (faq) {
    pushNode(nodes, byId, faq);
    edges.push(edge('faq_about', faq, article, 'derived', article.href));
  }

  return { nodes, edges };
}

/** Failure isolation — never throw across the page boundary. */
export function safeBuildVehiclePageGraph(ctx: VehiclePageGraphContext): EntityGraph {
  try {
    return buildVehiclePageGraph(ctx);
  } catch {
    return { nodes: [], edges: [] };
  }
}

export function safeBuildArticlePageGraph(ctx: ArticlePageGraphContext): EntityGraph {
  try {
    return buildArticlePageGraph(ctx);
  } catch {
    return { nodes: [], edges: [] };
  }
}

export interface EntityGraphCacheStamp {
  /** Stable entity identity (model:/article:/…). */
  entityId: string;
  /** updatedAt and/or related-slate version — must change when graph inputs change. */
  version: string;
}

/** Derive a cache stamp from page-local vehicle graph inputs (no catalog scan). */
export function vehicleGraphCacheStamp(ctx: VehiclePageGraphContext): EntityGraphCacheStamp {
  const brandId = (ctx.brand?.id || ctx.selectedVariant?.categoryId || '').trim();
  const selected = ctx.selectedVariant || ctx.variants?.[0];
  const entityId =
    modelEntityId(brandId, selected || {}) ||
    (selected?.id ? variantEntityId(selected.id) : '') ||
    'vehicle:unknown';
  const variantFp = (ctx.variants || [])
    .map((v) => v?.id || '')
    .filter(Boolean)
    .join(',');
  const recV = (ctx.recommendedVehicles || [])
    .map((v) => v?.id || '')
    .filter(Boolean)
    .slice(0, ENTITY_RELATED_VEHICLES_MAX)
    .join(',');
  const recA = (ctx.recommendedArticles || [])
    .map((a) => a?.id || '')
    .filter(Boolean)
    .slice(0, ENTITY_RELATED_ARTICLES_MAX)
    .join(',');
  const updatedAt = selected?.updatedAt || '';
  return {
    entityId,
    version: `${updatedAt}|v:${variantFp}|rv:${recV}|ra:${recA}`
  };
}

/** Derive a cache stamp from page-local article graph inputs. */
export function articleGraphCacheStamp(ctx: ArticlePageGraphContext): EntityGraphCacheStamp {
  const entityId = articleEntityId(ctx.article?.id) || 'article:unknown';
  const updatedAt = ctx.article?.updatedAt || ctx.article?.publishAt || '';
  const editV = (ctx.editorialVehicles || [])
    .map((v) => v?.id || '')
    .filter(Boolean)
    .slice(0, ENTITY_RELATED_VEHICLES_MAX)
    .join(',');
  const editA = (ctx.editorialArticles || [])
    .map((a) => a?.id || '')
    .filter(Boolean)
    .slice(0, ENTITY_RELATED_ARTICLES_MAX)
    .join(',');
  const recV = (ctx.recommendedVehicles || [])
    .map((v) => v?.id || '')
    .filter(Boolean)
    .slice(0, ENTITY_RELATED_VEHICLES_MAX)
    .join(',');
  const recA = (ctx.recommendedArticles || [])
    .map((a) => a?.id || '')
    .filter(Boolean)
    .slice(0, ENTITY_RELATED_ARTICLES_MAX)
    .join(',');
  return {
    entityId,
    version: `${updatedAt}|ev:${editV}|ea:${editA}|rv:${recV}|ra:${recA}`
  };
}

/**
 * Cached page graph — LRU by entityId|version. Derived graphs only.
 * On miss: safeBuild*; empty graphs from failures are not cached.
 */
export function getOrBuildVehiclePageGraph(
  ctx: VehiclePageGraphContext,
  stamp?: EntityGraphCacheStamp
): EntityGraph {
  const key = stamp || vehicleGraphCacheStamp(ctx);
  if (key.entityId) {
    const hit = getCachedEntityGraph(key.entityId, key.version);
    if (hit) return hit;
  }
  const graph = safeBuildVehiclePageGraph(ctx);
  if (key.entityId && graph.nodes.length > 0) {
    setCachedEntityGraph(key.entityId, key.version, graph);
  }
  return graph;
}

export function getOrBuildArticlePageGraph(
  ctx: ArticlePageGraphContext,
  stamp?: EntityGraphCacheStamp
): EntityGraph {
  const key = stamp || articleGraphCacheStamp(ctx);
  if (key.entityId) {
    const hit = getCachedEntityGraph(key.entityId, key.version);
    if (hit) return hit;
  }
  const graph = safeBuildArticlePageGraph(ctx);
  if (key.entityId && graph.nodes.length > 0) {
    setCachedEntityGraph(key.entityId, key.version, graph);
  }
  return graph;
}

function nodeByRef(graph: EntityGraph, id: string): EntityNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

/**
 * Outbound related vehicles for AEO: editorial about_vehicle if present,
 * else recommended_vehicle. Hrefs already from entity-href at edge build time.
 */
export function relatedVehiclesFromGraph(graph: EntityGraph | null | undefined): GraphRelatedVehicle[] {
  if (!graph?.edges?.length) return [];
  const editorial = graph.edges.filter((e) => e.type === 'article_about_vehicle');
  const recommended = graph.edges.filter((e) => e.type === 'recommended_vehicle');
  const chosen = editorial.length ? editorial : recommended;
  const out: GraphRelatedVehicle[] = [];
  const seen = new Set<string>();

  for (const e of chosen) {
    if (out.length >= ENTITY_RELATED_VEHICLES_MAX) break;
    const node = nodeByRef(graph, e.to.id);
    if (!node) continue;
    const rawId =
      node.type === 'variant'
        ? node.id.replace(/^variant:/, '')
        : node.type === 'model'
          ? node.id
          : '';
    if (!rawId || seen.has(rawId)) continue;
    seen.add(rawId);
    const href =
      e.href ||
      node.href ||
      (node.type === 'variant' ? compareHref([rawId]) : undefined);
    if (!href) continue;
    out.push({
      id: rawId,
      name: node.name,
      href,
      parentModel: typeof node.attrs['parentModel'] === 'string' ? node.attrs['parentModel'] : undefined,
      variantName: typeof node.attrs['variantName'] === 'string' ? node.attrs['variantName'] : undefined,
      brandName: typeof node.attrs['brandName'] === 'string' ? node.attrs['brandName'] : undefined,
      categoryId: typeof node.attrs['categoryId'] === 'string' ? node.attrs['categoryId'] : undefined
    });
  }
  return out;
}

export function relatedArticlesFromGraph(graph: EntityGraph | null | undefined): GraphRelatedArticle[] {
  if (!graph?.edges?.length) return [];
  const editorial = graph.edges.filter((e) => e.type === 'article_related_article');
  const recommended = graph.edges.filter((e) => e.type === 'recommended_article');
  const chosen = editorial.length ? editorial : recommended;
  const out: GraphRelatedArticle[] = [];
  const seen = new Set<string>();

  for (const e of chosen) {
    if (out.length >= ENTITY_RELATED_ARTICLES_MAX) break;
    const node = nodeByRef(graph, e.to.id);
    if (!node || node.type !== 'article') continue;
    const rawId = node.id.replace(/^article:/, '');
    if (!rawId || seen.has(rawId)) continue;
    seen.add(rawId);
    const href = e.href || node.href || articleHref(rawId);
    if (!href) continue;
    out.push({ id: rawId, title: node.name, href });
  }
  return out;
}

export function comparisonsFromGraph(graph: EntityGraph | null | undefined): GraphRelatedComparison[] {
  if (!graph?.edges?.length) return [];
  const out: GraphRelatedComparison[] = [];
  const seen = new Set<string>();
  for (const e of graph.edges) {
    if (e.type !== 'compares_with') continue;
    if (out.length >= ENTITY_COMPARE_EDGES_MAX) break;
    const from = nodeByRef(graph, e.from.id);
    const to = nodeByRef(graph, e.to.id);
    if (!from || !to || !e.href) continue;
    if (seen.has(e.href)) continue;
    seen.add(e.href);
    out.push({
      label: `${from.name} vs ${to.name}`,
      href: e.href
    });
  }
  return out;
}

/** First related vehicle node attrs — brand/model hints for article CTAs. */
export function primaryVehicleHintsFromGraph(
  graph: EntityGraph | null | undefined
): { brandSlug?: string; modelSlug?: string; brandName?: string; modelName?: string } {
  const related = relatedVehiclesFromGraph(graph);
  if (!related.length) return {};
  const first = related[0];
  const brandName = first.brandName;
  const modelName = first.parentModel;
  return {
    brandName,
    modelName,
    brandSlug: brandName ? entitySlugify(brandName) : first.brandSlug,
    modelSlug: modelName ? entitySlugify(modelName) : first.modelSlug
  };
}

const RELATED_EDGE_TYPES = new Set([
  'recommended_vehicle',
  'recommended_article',
  'article_about_vehicle',
  'article_related_article',
  'compares_with'
]);

export interface AeoRelatedFromGraph {
  relatedVehicles: Array<{ id: string; name: string; href: string }>;
  relatedArticles: Array<{ id: string; title: string; href: string }>;
  relatedComparisons: Array<{ label: string; href: string }>;
}

/**
 * AEO adapter: map page graph to related and compare rows.
 * Returns null when the graph has no related edges so callers fall back
 * to existing DTO generators (failure isolation / pre-recommendation load).
 */
export function aeoRelatedFromGraph(
  graph: EntityGraph | null | undefined,
  opts?: { selectedVariantId?: string; labelLeft?: string }
): AeoRelatedFromGraph | null {
  if (!graph?.nodes?.length || !graph.edges?.length) return null;
  const hasRelated = graph.edges.some((e) => RELATED_EDGE_TYPES.has(e.type));
  if (!hasRelated) return null;

  const excludeId = (opts?.selectedVariantId || '').trim();
  const relatedVehicles = relatedVehiclesFromGraph(graph)
    .filter((v) => !excludeId || v.id !== excludeId)
    .map((v) => ({ id: v.id, name: v.name, href: v.href }));

  const relatedArticles = relatedArticlesFromGraph(graph).map((a) => ({
    id: a.id,
    title: a.title,
    href: a.href
  }));

  let relatedComparisons = comparisonsFromGraph(graph);
  if (opts?.labelLeft?.trim()) {
    const left = opts.labelLeft.trim();
    relatedComparisons = relatedComparisons.map((c) => {
      const vs = c.label.indexOf(' vs ');
      if (vs < 0) return c;
      return { ...c, label: `${left} vs ${c.label.slice(vs + 4)}` };
    });
  }

  return { relatedVehicles, relatedArticles, relatedComparisons };
}
