import { AeoCtas } from '../aeo.types';

export interface CtaContext {
  selectedVariantId?: string;
  brandSlug?: string;
  modelSlug?: string;
  /** When true, view-specs points at in-page #aeo-specs anchor. */
  preferSpecsAnchor?: boolean;
}

/**
 * Compare + View Specs CTAs from page-local ids/slugs only.
 */
export function generateCtas(ctx: CtaContext): AeoCtas {
  const ctas: AeoCtas = {};

  if (ctx.selectedVariantId?.trim()) {
    ctas.compare = {
      label: 'Compare',
      href: `/compare?ids=${encodeURIComponent(ctx.selectedVariantId.trim())}`
    };
  }

  if (ctx.preferSpecsAnchor) {
    ctas.viewSpecs = { label: 'View Specs', href: '#aeo-specs' };
  } else if (ctx.brandSlug && ctx.modelSlug) {
    ctas.viewSpecs = {
      label: 'View Specs',
      href: `/ev/${ctx.brandSlug}/${ctx.modelSlug}#aeo-specs`
    };
  }

  return ctas;
}
