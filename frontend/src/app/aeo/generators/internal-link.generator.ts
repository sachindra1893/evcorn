import {
  articlesIndexHref,
  brandBrowseHref,
  compareHref,
  energyHref,
  evsIndexHref,
  faqsHref,
  modelHref
} from '../../entity/entity-href';
import { AeoInternalLink, AeoRelatedArticle, AeoRelatedVehicle } from '../aeo.types';

const MAX_LINKS = 8;

export interface InternalLinkContext {
  brandName?: string;
  brandSlug?: string;
  modelName?: string;
  modelSlug?: string;
  selectedVariantId?: string;
  /** When false, skip model overview (avoids self-link on vehicle detail). Default true. */
  includeModelOverview?: boolean;
  /**
   * Optional related slate — omit when Related EVs / Articles sections already render them
   * to avoid duplicate on-page links.
   */
  relatedVehicles?: AeoRelatedVehicle[];
  relatedArticles?: AeoRelatedArticle[];
  includeFaqs?: boolean;
  includeEnergy?: boolean;
}

/**
 * Site-internal navigation hints from entities already on the page.
 * Related slate is optional; prefer dedicated Related* sections over duplicating here.
 * Hubs/model paths via entity-href SSOT (Phase 7.3 M1).
 */
export function generateInternalLinks(ctx: InternalLinkContext): AeoInternalLink[] {
  const links: AeoInternalLink[] = [];
  const seen = new Set<string>();

  const push = (label: string, href: string) => {
    if (!label || !href || seen.has(href) || links.length >= MAX_LINKS) return;
    seen.add(href);
    links.push({ label, href });
  };

  if (ctx.brandSlug || ctx.brandName) {
    // Prefer page-canonical brandSlug (already slugify(Category.name) on detail routes).
    push(
      ctx.brandName ? `All ${ctx.brandName} EVs` : 'Browse brand EVs',
      brandBrowseHref(ctx.brandSlug || ctx.brandName)
    );
  } else {
    push('Browse EVs', evsIndexHref());
  }

  if (ctx.includeModelOverview !== false && (ctx.brandSlug || ctx.brandName) && ctx.modelSlug) {
    // Path segments come from the route — pass as brandSlug/modelSlug so a short
    // display brandName cannot rewrite `/ev/tata-motors/...` → `/ev/tata/...`.
    const href = modelHref({
      brandSlug: ctx.brandSlug || ctx.brandName,
      modelSlug: ctx.modelSlug,
      parentModel: ctx.modelName
    });
    if (href) {
      push(ctx.modelName ? `${ctx.modelName} overview` : 'Model overview', href);
    }
  }

  if (ctx.selectedVariantId) {
    push('Compare this EV', compareHref([ctx.selectedVariantId]));
  } else {
    push('EV Compare', compareHref([]));
  }

  push('EV articles & guides', articlesIndexHref());

  if (ctx.includeFaqs !== false) {
    push('EVCorn FAQs', faqsHref());
  }

  for (const v of ctx.relatedVehicles || []) {
    if (links.length >= MAX_LINKS) break;
    push(v.name, v.href);
  }
  for (const a of ctx.relatedArticles || []) {
    if (links.length >= MAX_LINKS) break;
    push(a.title, a.href);
  }

  return links;
}
