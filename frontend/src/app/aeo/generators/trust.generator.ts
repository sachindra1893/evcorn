import { AeoTrust } from '../aeo.types';
import { formatLastUpdatedLabel } from './last-updated';

export interface TrustContext {
  kind: 'vehicle' | 'article';
  brandName?: string;
  author?: { name?: string; role?: string } | string;
  lastUpdated?: string;
}

/**
 * Trust / citation chrome from author defaults + updated date + independent-catalog note.
 */
export function generateTrust(ctx: TrustContext): AeoTrust {
  const updatedLabel = formatLastUpdatedLabel(ctx.lastUpdated);
  const citationNote =
    ctx.kind === 'vehicle'
      ? ctx.brandName
        ? `Specs for ${ctx.brandName} vehicles on EVCorn are compiled from published brand materials for an independent catalog — not an official brand site.`
        : 'Specs on EVCorn are compiled from published brand materials for an independent catalog — not an official brand site.'
      : 'EVCorn editorial coverage is independent and not affiliated with EV manufacturers.';

  const trust: AeoTrust = { citationNote };
  if (updatedLabel) trust.updatedLabel = `Updated ${updatedLabel}`;

  if (ctx.kind === 'article') {
    const authorLabel = resolveAuthorLabel(ctx.author);
    if (authorLabel) trust.authorLabel = authorLabel;
  }

  return trust;
}

function resolveAuthorLabel(author: TrustContext['author']): string | undefined {
  if (!author) return 'EVCorn Editorial';
  if (typeof author === 'string') {
    const name = author.trim();
    return name || 'EVCorn Editorial';
  }
  const name = author.name?.trim() || 'EVCorn Editorial';
  const role = author.role?.trim();
  return role ? `${name} · ${role}` : name;
}
