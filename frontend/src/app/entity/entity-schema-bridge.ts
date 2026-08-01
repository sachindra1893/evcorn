/**
 * Phase 7.3 M3 — Entity Graph → SchemaService inputs.
 * Prepares plain objects only; SchemaService remains the sole JSON-LD writer.
 * Caps related slots at emit time; omits empty arrays; never invents CMS facts.
 */

import {
  relatedArticlesFromGraph,
  relatedVehiclesFromGraph
} from './entity-graph';
import {
  ENTITY_RELATED_ARTICLES_MAX,
  ENTITY_RELATED_VEHICLES_MAX,
  EntityGraph,
  EntityNode
} from './entity.types';

/** Schema.org @type hint for Thing refs (SchemaService maps to JSON-LD). */
export type SchemaThingType =
  | 'Brand'
  | 'Article'
  | 'Person'
  | 'Thing'
  | 'Product'
  | 'Car';

export interface SchemaThingRefInput {
  /** Relative canonical path from entity-href (may include intentional query). */
  path: string;
  name?: string;
  /** Primary @type, or multi-type for Product+Car. */
  types: SchemaThingType[];
}

export interface SchemaBrandInput {
  name: string;
  /** Brand browse path (`/evs?category=…`) — used for @id / url. */
  path: string;
  logoUrl?: string;
  /** Persisted Category id (CMS) — never invented. */
  identifier?: string;
}

export interface SchemaAuthorPersonInput {
  name: string;
  jobTitle?: string;
  description?: string;
  imageUrl?: string;
  /** Real social URLs only (twitter / linkedin from CMS). */
  sameAs?: string[];
}

export interface VehicleSchemaGraphInput {
  /** Relative model page path for Product/Car @id. */
  path?: string;
  brand?: SchemaBrandInput;
  about?: SchemaThingRefInput[];
  /** Related vehicles (≤6) + articles (≤4). */
  isRelatedTo?: SchemaThingRefInput[];
}

export interface ArticleSchemaGraphInput {
  /** Relative article path for Article @id. */
  path?: string;
  about?: SchemaThingRefInput[];
  mentions?: SchemaThingRefInput[];
  /** Person only when CMS author has validating extras (role/bio/image/social). */
  authorPerson?: SchemaAuthorPersonInput;
}

function nodeById(graph: EntityGraph, id: string): EntityNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

function vehicleTypes(): SchemaThingType[] {
  return ['Product', 'Car'];
}

function refFromNode(node: EntityNode | undefined): SchemaThingRefInput | null {
  if (!node?.href?.trim()) return null;
  const path = node.href.trim();
  const name = (node.name || '').trim() || undefined;

  if (node.type === 'brand') {
    return { path, name, types: ['Brand'] };
  }
  if (node.type === 'model' || node.type === 'variant') {
    return { path, name, types: vehicleTypes() };
  }
  if (node.type === 'article') {
    return { path, name, types: ['Article'] };
  }
  if (node.type === 'author') {
    return { path, name, types: ['Person'] };
  }
  return { path, name, types: ['Thing'] };
}

function pushUniqueRef(
  out: SchemaThingRefInput[],
  seen: Set<string>,
  ref: SchemaThingRefInput | null,
  max?: number
): void {
  if (!ref) return;
  if (max !== undefined && out.length >= max) return;
  if (seen.has(ref.path)) return;
  seen.add(ref.path);
  out.push(ref);
}

function brandInputFromNode(node: EntityNode | undefined): SchemaBrandInput | undefined {
  if (!node || node.type !== 'brand' || !node.href?.trim() || !node.name?.trim()) {
    return undefined;
  }
  const logoUrl =
    (typeof node.attrs['logoUrl'] === 'string' && node.attrs['logoUrl']) ||
    node.imageUrl ||
    undefined;
  const rawId = node.id.replace(/^brand:/, '').trim();
  return {
    name: node.name.trim(),
    path: node.href.trim(),
    ...(logoUrl && logoUrl !== 'N/A' ? { logoUrl } : {}),
    ...(rawId ? { identifier: rawId } : {})
  };
}

/**
 * Extract Brand + vehicle linking inputs from a vehicle page graph.
 * Returns null when graph has nothing useful (callers keep Phase 7.1 schema).
 */
export function vehicleSchemaFromGraph(
  graph: EntityGraph | null | undefined
): VehicleSchemaGraphInput | null {
  if (!graph?.nodes?.length) return null;

  const model = graph.nodes.find((n) => n.type === 'model');
  const brand = graph.nodes.find((n) => n.type === 'brand');
  const brandInput = brandInputFromNode(brand);

  const about: SchemaThingRefInput[] = [];
  const aboutSeen = new Set<string>();
  pushUniqueRef(about, aboutSeen, refFromNode(brand));

  const isRelatedTo: SchemaThingRefInput[] = [];
  const relatedSeen = new Set<string>();

  // Related vehicles ≤6 (graph helpers already capped; re-enforce at emit).
  for (const v of relatedVehiclesFromGraph(graph)) {
    if (isRelatedTo.length >= ENTITY_RELATED_VEHICLES_MAX) break;
    if (!v.href?.trim()) continue;
    pushUniqueRef(
      isRelatedTo,
      relatedSeen,
      { path: v.href.trim(), name: v.name, types: vehicleTypes() },
      ENTITY_RELATED_VEHICLES_MAX
    );
  }

  // Related articles ≤4 — append after vehicles (combined isRelatedTo list).
  let articleCount = 0;
  for (const a of relatedArticlesFromGraph(graph)) {
    if (articleCount >= ENTITY_RELATED_ARTICLES_MAX) break;
    if (!a.href?.trim()) continue;
    const before = isRelatedTo.length;
    pushUniqueRef(isRelatedTo, relatedSeen, {
      path: a.href.trim(),
      name: a.title,
      types: ['Article']
    });
    if (isRelatedTo.length > before) articleCount++;
  }

  const out: VehicleSchemaGraphInput = {};
  if (model?.href?.trim()) out.path = model.href.trim();
  if (brandInput) out.brand = brandInput;
  if (about.length) out.about = about;
  if (isRelatedTo.length) out.isRelatedTo = isRelatedTo;

  if (!out.path && !out.brand && !out.about && !out.isRelatedTo) return null;
  return out;
}

export interface ArticleAuthorLike {
  name?: string | null;
  role?: string | null;
  bio?: string | null;
  imageUrl?: string | null;
  socialLinks?: {
    twitter?: string | null;
    linkedin?: string | null;
  } | null;
}

function nonEmpty(value: string | null | undefined): string | undefined {
  const t = (value || '').trim();
  return t && t !== 'N/A' ? t : undefined;
}

/**
 * Person only when CMS provides a name plus at least one validating field
 * (role / bio / image / social). No invented sameAs or profile URLs.
 */
export function authorPersonFromCms(
  author: ArticleAuthorLike | string | null | undefined
): SchemaAuthorPersonInput | undefined {
  if (!author) return undefined;
  if (typeof author === 'string') {
    // Bare string — keep SchemaService Organization fallback (Phase 7.1).
    return undefined;
  }

  const name = nonEmpty(author.name);
  if (!name) return undefined;

  const jobTitle = nonEmpty(author.role);
  const description = nonEmpty(author.bio);
  const imageUrl = nonEmpty(author.imageUrl);
  const twitter = nonEmpty(author.socialLinks?.twitter);
  const linkedin = nonEmpty(author.socialLinks?.linkedin);
  const sameAs = [twitter, linkedin].filter((u): u is string => !!u);

  const hasValidatingExtra = !!(jobTitle || description || imageUrl || sameAs.length);
  if (!hasValidatingExtra) return undefined;

  return {
    name,
    ...(jobTitle ? { jobTitle } : {}),
    ...(description ? { description } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(sameAs.length ? { sameAs } : {})
  };
}

/**
 * Extract Article linking inputs from an article page graph (+ optional CMS author).
 */
export function articleSchemaFromGraph(
  graph: EntityGraph | null | undefined,
  opts?: { author?: ArticleAuthorLike | string | null }
): ArticleSchemaGraphInput | null {
  const article = graph?.nodes?.find((n) => n.type === 'article');
  const about: SchemaThingRefInput[] = [];
  const aboutSeen = new Set<string>();
  const mentions: SchemaThingRefInput[] = [];
  const mentionSeen = new Set<string>();

  if (graph?.edges?.length) {
    for (const e of graph.edges) {
      if (e.type === 'article_about_brand' || e.type === 'article_about_vehicle') {
        const node = nodeById(graph, e.to.id);
        const ref = refFromNode(node) || (e.href
          ? {
              path: e.href,
              name: node?.name,
              types:
                e.type === 'article_about_brand'
                  ? (['Brand'] as SchemaThingType[])
                  : vehicleTypes()
            }
          : null);
        pushUniqueRef(about, aboutSeen, ref);
      }
    }

    // Recommended vehicles fill about when editorial about_vehicle edges absent.
    const hasEditorialVehicles = graph.edges.some((e) => e.type === 'article_about_vehicle');
    if (!hasEditorialVehicles) {
      for (const v of relatedVehiclesFromGraph(graph)) {
        pushUniqueRef(
          about,
          aboutSeen,
          v.href
            ? { path: v.href.trim(), name: v.name, types: vehicleTypes() }
            : null,
          ENTITY_RELATED_VEHICLES_MAX
        );
      }
    }

    // Mentions = related articles (editorial or recommended), ≤4.
    for (const a of relatedArticlesFromGraph(graph)) {
      pushUniqueRef(
        mentions,
        mentionSeen,
        a.href
          ? { path: a.href.trim(), name: a.title, types: ['Article'] }
          : null,
        ENTITY_RELATED_ARTICLES_MAX
      );
    }
  }

  // Cap about vehicles/brands: allow brands unbounded within page-local editorial,
  // but total vehicle-typed about entries ≤6.
  const cappedAbout = capAboutVehicles(about);

  const authorPerson = authorPersonFromCms(opts?.author);

  const out: ArticleSchemaGraphInput = {};
  if (article?.href?.trim()) out.path = article.href.trim();
  if (cappedAbout.length) out.about = cappedAbout;
  if (mentions.length) out.mentions = mentions;
  if (authorPerson) out.authorPerson = authorPerson;

  if (!out.path && !out.about && !out.mentions && !out.authorPerson) return null;
  return out;
}

function capAboutVehicles(about: SchemaThingRefInput[]): SchemaThingRefInput[] {
  let vehicleCount = 0;
  const out: SchemaThingRefInput[] = [];
  for (const ref of about) {
    const isVehicle = ref.types.includes('Product') || ref.types.includes('Car');
    if (isVehicle) {
      if (vehicleCount >= ENTITY_RELATED_VEHICLES_MAX) continue;
      vehicleCount++;
    }
    out.push(ref);
  }
  return out;
}

/** Failure isolation — never throw across the page / schema boundary. */
export function safeVehicleSchemaFromGraph(
  graph: EntityGraph | null | undefined
): VehicleSchemaGraphInput | null {
  try {
    return vehicleSchemaFromGraph(graph);
  } catch {
    return null;
  }
}

export function safeArticleSchemaFromGraph(
  graph: EntityGraph | null | undefined,
  opts?: { author?: ArticleAuthorLike | string | null }
): ArticleSchemaGraphInput | null {
  try {
    return articleSchemaFromGraph(graph, opts);
  } catch {
    return null;
  }
}
