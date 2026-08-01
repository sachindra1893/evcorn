import {
  articleEntityId,
  brandEntityId,
  modelEntityId,
  resolveModelName,
  variantEntityId
} from './entity-id';
import { articleHref, brandBrowseHref, modelHref } from './entity-href';
import { entitySlugify } from './entity-slug';
import { EntityNode, NormalizedArticleRelationships } from './entity.types';

function asIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const id = item.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Normalize article relationship keys to schema SSOT `*Ids`.
 * Accepts Mongo `*Ids` **or** historical DTO/FE short names.
 */
export function normalizeArticleRelationships(
  raw: unknown
): NormalizedArticleRelationships {
  const r =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return {
    relatedArticleIds: asIdList(r['relatedArticleIds'] ?? r['relatedArticles']),
    relatedVehicleIds: asIdList(r['relatedVehicleIds'] ?? r['relatedVehicles']),
    relatedBrandIds: asIdList(r['relatedBrandIds'] ?? r['relatedBrands'])
  };
}

/** Drop empty relationship arrays (JSON-LD / graph emit — never emit `[]`). */
export function compactArticleRelationships(
  rel: NormalizedArticleRelationships
): Partial<NormalizedArticleRelationships> {
  const out: Partial<NormalizedArticleRelationships> = {};
  if (rel.relatedArticleIds.length) out.relatedArticleIds = rel.relatedArticleIds;
  if (rel.relatedVehicleIds.length) out.relatedVehicleIds = rel.relatedVehicleIds;
  if (rel.relatedBrandIds.length) out.relatedBrandIds = rel.relatedBrandIds;
  return out;
}

export interface BrandLike {
  id?: string | null;
  name?: string | null;
  logoUrl?: string | null;
  cloudinaryLogo?: { url?: string | null } | null;
  updatedAt?: string | null;
}

export interface VehicleLike {
  id?: string | null;
  name?: string | null;
  categoryId?: string | null;
  brandSlug?: string | null;
  brandName?: string | null;
  parentModel?: string | null;
  modelSlug?: string | null;
  variantName?: string | null;
  bodyStyle?: string | null;
  status?: string | null;
  imageUrl?: string | null;
  updatedAt?: string | null;
  pricing?: { exShowroomPriceINR?: number | null } | null;
  price?: string | null;
}

export interface ArticleLike {
  id?: string | null;
  slug?: string | null;
  title?: string | null;
  description?: string | null;
  categoryId?: string | null;
  imageUrl?: string | null;
  author?:
    | {
        name?: string | null;
        role?: string | null;
        bio?: string | null;
        imageUrl?: string | null;
        socialLinks?: {
          twitter?: string | null;
          linkedin?: string | null;
        } | null;
      }
    | string
    | null;
  seo?: { metaDescription?: string | null } | null;
  publishAt?: string | null;
  updatedAt?: string | null;
  relationships?: unknown;
}

function omitEmptyAttrs(attrs: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    if (value === '' || value === 'N/A') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

export function normalizeBrandNode(brand: BrandLike | null | undefined): EntityNode | null {
  if (!brand) return null;
  const id = brandEntityId(brand.id);
  const name = (brand.name || '').trim();
  if (!id || !name) return null;

  const logoUrl = brand.logoUrl || brand.cloudinaryLogo?.url || undefined;
  const href = brandBrowseHref(name);
  const aliases = [entitySlugify(name), (brand.id || '').trim()].filter(Boolean);

  return {
    type: 'brand',
    id,
    name,
    href,
    aliases: Array.from(new Set(aliases)),
    attrs: omitEmptyAttrs({ logoUrl }),
    updatedAt: brand.updatedAt || undefined,
    imageUrl: logoUrl || undefined
  };
}

export function normalizeVariantNode(
  vehicle: VehicleLike | null | undefined
): EntityNode | null {
  if (!vehicle) return null;
  const id = variantEntityId(vehicle.id);
  if (!id) return null;

  const parentModel = resolveModelName(vehicle);
  const variantName = (vehicle.variantName || '').trim();
  const name =
    [parentModel, variantName].filter(Boolean).join(' ').trim() ||
    (vehicle.name || '').trim() ||
    'EV';

  const href =
    modelHref({
      brandName: vehicle.brandName,
      brandSlug: vehicle.brandSlug || vehicle.categoryId,
      parentModel: vehicle.parentModel,
      name: vehicle.name,
      modelSlug: vehicle.modelSlug
    }) || undefined;

  const aliases = [
    (vehicle.brandSlug || '').trim(),
    entitySlugify(vehicle.modelSlug || ''),
    (vehicle.id || '').trim()
  ].filter(Boolean);

  return {
    type: 'variant',
    id,
    name,
    href,
    aliases: Array.from(new Set(aliases)),
    attrs: omitEmptyAttrs({
      categoryId: vehicle.categoryId,
      parentModel: parentModel || undefined,
      variantName: variantName || undefined,
      bodyStyle: vehicle.bodyStyle,
      status: vehicle.status,
      pricingExShowroomINR: vehicle.pricing?.exShowroomPriceINR || undefined,
      price: vehicle.price
    }),
    updatedAt: vehicle.updatedAt || undefined,
    imageUrl: vehicle.imageUrl || undefined
  };
}

/**
 * Virtual model node from brand id + any variant (or model fields).
 * Identity ignores dirty modelSlug when parentModel is present.
 */
export function normalizeModelNode(
  brandId: string | null | undefined,
  model: VehicleLike | null | undefined,
  opts?: { brandName?: string | null }
): EntityNode | null {
  if (!model) return null;
  const id = modelEntityId(brandId, model);
  const name = resolveModelName(model);
  if (!id || !name) return null;

  const href =
    modelHref({
      brandName: opts?.brandName || model.brandName,
      brandSlug: model.brandSlug || brandId,
      parentModel: model.parentModel,
      name: model.name,
      modelSlug: model.modelSlug
    }) || undefined;

  const aliases = [entitySlugify(model.modelSlug || ''), entitySlugify(name)].filter(Boolean);

  return {
    type: 'model',
    id,
    name,
    href,
    aliases: Array.from(new Set(aliases)),
    attrs: omitEmptyAttrs({
      brandId: (brandId || '').trim() || undefined,
      brandName: opts?.brandName || model.brandName,
      bodyStyle: model.bodyStyle,
      status: model.status
    }),
    updatedAt: model.updatedAt || undefined,
    imageUrl: model.imageUrl || undefined
  };
}

export function normalizeArticleNode(
  article: ArticleLike | null | undefined
): EntityNode | null {
  if (!article) return null;
  const id = articleEntityId(article.id);
  const title = (article.title || '').trim();
  if (!id || !title) return null;

  const relationships = compactArticleRelationships(
    normalizeArticleRelationships(article.relationships)
  );
  const authorName =
    typeof article.author === 'string'
      ? article.author.trim()
      : (article.author?.name || '').trim();

  const aliases = [(article.slug || '').trim()].filter(Boolean);

  return {
    type: 'article',
    id,
    name: title,
    href: articleHref(article.id),
    aliases: aliases.length ? aliases : undefined,
    attrs: omitEmptyAttrs({
      categoryId: article.categoryId,
      description: article.description,
      authorName: authorName || undefined,
      seoMetaDescription: article.seo?.metaDescription,
      publishAt: article.publishAt,
      ...relationships
    }),
    updatedAt: article.updatedAt || undefined,
    imageUrl: article.imageUrl || undefined
  };
}
