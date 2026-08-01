import { entitySlugify } from './entity-slug';

export interface ModelIdentityInput {
  parentModel?: string | null;
  name?: string | null;
  /** Historical / DTO field — never preferred over parentModel for identity. */
  modelSlug?: string | null;
}

/**
 * Resolve the semantic model display name used for identity.
 * Order is locked (architecture §3.4): parentModel → packed name → modelSlug.
 */
export function resolveModelName(input: ModelIdentityInput): string {
  const parent = (input.parentModel || '').trim();
  if (parent) return parent;

  const rawName = (input.name || '').trim();
  if (rawName.includes('::')) {
    const packed = rawName.split('::')[0].trim();
    if (packed) return packed;
  }

  const slugField = (input.modelSlug || '').trim();
  if (slugField) return slugField;

  return rawName;
}

/** Stable brand id: `brand:{category.id}` */
export function brandEntityId(brandId: string | null | undefined): string {
  const id = (brandId || '').trim();
  return id ? `brand:${id}` : '';
}

/**
 * Stable model id: `model:{brandId}:{modelKey}`.
 * brandId is Category.id (not slugify(brandName)).
 * modelKey is slugify(resolveModelName(...)) — parentModel wins over modelSlug.
 */
export function modelEntityId(
  brandId: string | null | undefined,
  model: ModelIdentityInput
): string {
  const bid = (brandId || '').trim();
  const modelKey = entitySlugify(resolveModelName(model));
  if (!bid || !modelKey) return '';
  return `model:${bid}:${modelKey}`;
}

/** Stable variant id: `variant:{vehicle.id}` */
export function variantEntityId(vehicleId: string | null | undefined): string {
  const id = (vehicleId || '').trim();
  return id ? `variant:${id}` : '';
}

/** Stable article id: `article:{article.id}` — slug routing must not change this. */
export function articleEntityId(articleId: string | null | undefined): string {
  const id = (articleId || '').trim();
  return id ? `article:${id}` : '';
}

/** Author identity for schema Person (not a public page in v1). */
export function authorEntityId(authorName: string | null | undefined): string {
  const key = entitySlugify(authorName || '');
  return key ? `author:${key}` : '';
}
