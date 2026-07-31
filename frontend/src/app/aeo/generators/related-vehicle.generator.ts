import { AeoRelatedVehicle, AeoRelatedVehicleInput } from '../aeo.types';

const MAX_RELATED = 6;

/**
 * Map pre-fetched related vehicle DTOs → Aeo related links.
 * Pure: does not call RecommendationService / HTTP.
 */
export function generateRelatedVehicles(
  related: AeoRelatedVehicleInput[] | null | undefined,
  opts?: { excludeId?: string; excludeModelSlug?: string; excludeBrandSlug?: string }
): AeoRelatedVehicle[] {
  if (!related?.length) return [];

  const out: AeoRelatedVehicle[] = [];
  const seen = new Set<string>();

  for (const item of related) {
    if (out.length >= MAX_RELATED) break;
    const id = item.id?.trim();
    if (!id || id === opts?.excludeId) continue;

    // Canonical vehicle URLs use slugify(category.name), not raw brandSlug/categoryId
    // (e.g. brandSlug "tata" → route "/ev/tata-motors/..."). Prefer brandName.
    const brandSlug = slugify(item.brandName || item.brandSlug || item.categoryId || '');
    const modelSlug = slugify(item.modelSlug || item.parentModel || '');
    if (
      opts?.excludeBrandSlug &&
      opts?.excludeModelSlug &&
      brandSlug === opts.excludeBrandSlug &&
      modelSlug === opts.excludeModelSlug
    ) {
      continue;
    }

    const dedupeKey = brandSlug && modelSlug ? `${brandSlug}/${modelSlug}` : id;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const name =
      [item.parentModel, item.variantName].filter(Boolean).join(' ') ||
      item.name ||
      'Related EV';
    // Only emit /ev/ when we have a brandName-backed slug (or both slugs look usable).
    // Otherwise fall back to a valid compare deep-link — never invent a placeholder path.
    const canLinkEv = !!(item.brandName?.trim() || item.brandSlug?.trim()) && !!brandSlug && !!modelSlug;
    const href = canLinkEv
      ? `/ev/${brandSlug}/${modelSlug}`
      : `/compare?ids=${encodeURIComponent(id)}`;

    out.push({ id, name: name.trim(), href });
  }

  return out;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
