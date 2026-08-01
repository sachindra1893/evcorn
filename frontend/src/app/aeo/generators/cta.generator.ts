import { compareHref, modelSpecsHref } from '../../entity/entity-href';
import { AeoCtas } from '../aeo.types';

export interface CtaContext {
  selectedVariantId?: string;
  brandSlug?: string;
  modelSlug?: string;
  brandName?: string;
  modelName?: string;
  /** When true, view-specs points at in-page #aeo-specs anchor. */
  preferSpecsAnchor?: boolean;
}

/**
 * Compare + View Specs CTAs from page-local ids/slugs only.
 * Hrefs via entity-href SSOT (Phase 7.3 M1).
 */
export function generateCtas(ctx: CtaContext): AeoCtas {
  const ctas: AeoCtas = {};

  if (ctx.selectedVariantId?.trim()) {
    ctas.compare = {
      label: 'Compare',
      href: compareHref([ctx.selectedVariantId.trim()])
    };
  }

  if (ctx.preferSpecsAnchor) {
    ctas.viewSpecs = { label: 'View Specs', href: '#aeo-specs' };
  } else {
    const specs = modelSpecsHref({
      brandName: ctx.brandName,
      brandSlug: ctx.brandSlug,
      parentModel: ctx.modelName,
      modelSlug: ctx.modelSlug
    });
    if (specs) {
      ctas.viewSpecs = { label: 'View Specs', href: specs };
    }
  }

  return ctas;
}
