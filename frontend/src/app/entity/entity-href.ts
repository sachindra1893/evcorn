import { resolveModelName, ModelIdentityInput } from './entity-id';
import { entitySlugify } from './entity-slug';

export interface ModelHrefInput extends ModelIdentityInput {
  /** Prefer Category display name so paths match browse (`/ev/tata-motors/...`). */
  brandName?: string | null;
  brandSlug?: string | null;
}

/**
 * Canonical brand browse filter. Prefer slugify(brandName) to match browse chips.
 */
export function brandBrowseHref(brandNameOrSlug: string | null | undefined): string {
  const slug = entitySlugify(brandNameOrSlug || '');
  if (!slug) return '/evs';
  return `/evs?category=${encodeURIComponent(slug)}`;
}

/**
 * Canonical model page path `/ev/{brandPath}/{modelPath}`.
 * brandPath prefers brandName over brandSlug (existing public URLs).
 * modelPath uses the same resolveModelName order as entity identity (parentModel first).
 * Returns undefined when a safe /ev/ link cannot be built (caller may fall back to compare).
 */
export function modelHref(input: ModelHrefInput): string | undefined {
  const brandPath = entitySlugify(
    (input.brandName || '').trim() || (input.brandSlug || '').trim()
  );
  const modelPath = entitySlugify(resolveModelName(input));
  if (!brandPath || !modelPath) return undefined;
  return `/ev/${brandPath}/${modelPath}`;
}

/** Model overview + in-page specs anchor (AEO CTA). */
export function modelSpecsHref(input: ModelHrefInput): string | undefined {
  const base = modelHref(input);
  return base ? `${base}#aeo-specs` : undefined;
}

/** Public article path — id-based so future slug routes do not break identity. */
export function articleHref(articleId: string | null | undefined): string | undefined {
  const id = (articleId || '').trim();
  return id ? `/articles/${id}` : undefined;
}

export function compareHref(ids: Array<string | null | undefined>): string {
  const clean = ids.map((id) => (id || '').trim()).filter(Boolean);
  if (!clean.length) return '/compare';
  return `/compare?ids=${clean.map((id) => encodeURIComponent(id)).join(',')}`;
}

export function evsIndexHref(): string {
  return '/evs';
}

export function articlesIndexHref(): string {
  return '/articles';
}

export function faqsHref(): string {
  return '/faqs';
}

export function energyHref(): string {
  return '/energy';
}
