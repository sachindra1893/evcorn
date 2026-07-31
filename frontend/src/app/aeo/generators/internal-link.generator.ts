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
 */
export function generateInternalLinks(ctx: InternalLinkContext): AeoInternalLink[] {
  const links: AeoInternalLink[] = [];
  const seen = new Set<string>();

  const push = (label: string, href: string) => {
    if (!label || !href || seen.has(href) || links.length >= MAX_LINKS) return;
    seen.add(href);
    links.push({ label, href });
  };

  if (ctx.brandSlug) {
    push(
      ctx.brandName ? `All ${ctx.brandName} EVs` : 'Browse brand EVs',
      `/evs?category=${encodeURIComponent(ctx.brandSlug)}`
    );
  } else {
    push('Browse EVs', '/evs');
  }

  if (ctx.includeModelOverview !== false && ctx.brandSlug && ctx.modelSlug) {
    push(
      ctx.modelName ? `${ctx.modelName} overview` : 'Model overview',
      `/ev/${ctx.brandSlug}/${ctx.modelSlug}`
    );
  }

  if (ctx.selectedVariantId) {
    push('Compare this EV', `/compare?ids=${encodeURIComponent(ctx.selectedVariantId)}`);
  } else {
    push('EV Compare', '/compare');
  }

  push('EV articles & guides', '/articles');

  if (ctx.includeFaqs !== false) {
    push('EVCorn FAQs', '/faqs');
  }
  if (ctx.includeEnergy) {
    push('Energy & charging', '/energy');
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
