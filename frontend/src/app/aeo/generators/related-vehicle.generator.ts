import { compareHref, modelHref } from '../../entity/entity-href';
import { entitySlugify } from '../../entity/entity-slug';
import { AeoRelatedVehicle, AeoRelatedVehicleInput } from '../aeo.types';

const MAX_RELATED = 6;

/**
 * Map pre-fetched related vehicle DTOs → Aeo related links.
 * Pure: does not call RecommendationService / HTTP.
 * Hrefs via entity-href SSOT (Phase 7.3 M1).
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
    const brandSlug = entitySlugify(item.brandName || item.brandSlug || item.categoryId || '');
    const modelSlug = entitySlugify(
      item.parentModel || item.modelSlug || item.name || ''
    );
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
    const evHref = modelHref({
      brandName: item.brandName,
      brandSlug: item.brandSlug || item.categoryId,
      parentModel: item.parentModel,
      modelSlug: item.modelSlug,
      name: item.name
    });
    // Only emit /ev/ when entity-href can build a brand+model path.
    // Otherwise fall back to a valid compare deep-link — never invent a placeholder path.
    const href = evHref || compareHref([id]);

    out.push({ id, name: name.trim(), href });
  }

  return out;
}
