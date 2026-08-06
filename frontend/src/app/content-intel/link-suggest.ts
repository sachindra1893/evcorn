/**
 * Phase 7.4 — LinkSuggestion production (pure, no HTTP).
 * Hrefs via entity-href only. Discard if evidence cannot be cited.
 * Canonicality: one LinkSuggestion per stable targetEntityId; merge evidence; preserve order.
 */

import {
  articlesIndexHref,
  brandBrowseHref,
  compareHref,
  energyHref,
  evsIndexHref,
  faqsHref
} from '../entity/entity-href';
import {
  LinkEvidence,
  LinkSuggestion,
  PillarRef,
  RelatedReadingPlan,
  TopicMembership
} from './content-intel.types';
import {
  canonicalLinkSuggestions,
  isValidLinkSuggestion,
  normalizeDestinationHref
} from './link-canonical';
import { linkSuggestionsFromRelatedReading } from './related-reading';

export {
  canonicalLinkSuggestions,
  compareTargetEntityId,
  mergeLinkEvidence
} from './link-canonical';

function hubSuggestion(
  label: string,
  href: string,
  evidence: LinkEvidence,
  targetEntityId: string
): LinkSuggestion {
  return {
    label,
    href,
    targetEntityId,
    relKind: 'hub',
    evidence
  };
}

function pillarTargetEntityId(pillar: PillarRef): string {
  if (pillar.id.startsWith('pillar:model:')) {
    return `model:${pillar.id.slice('pillar:model:'.length)}`;
  }
  if (pillar.id.startsWith('pillar:brand:')) {
    return `brand:${pillar.id.slice('pillar:brand:'.length)}`;
  }
  if (pillar.id.startsWith('pillar:site_hub:')) {
    return `site_hub:${pillar.id.slice('pillar:site_hub:'.length)}`;
  }
  return pillar.id;
}

/**
 * Hub / pillar link suggestions from grounded topics + existing routes.
 * Skips self model overview when `excludeModelHref` matches.
 */
export function suggestHubLinks(
  memberships: TopicMembership[],
  opts?: {
    pillar?: PillarRef;
    excludeModelHref?: string;
    selectedVariantId?: string;
    includeEnergy?: boolean;
  }
): LinkSuggestion[] {
  const raw: LinkSuggestion[] = [];

  const brand = memberships.find((m) => m.topic.kind === 'brand' && m.topic.href);
  if (brand?.topic.href && brand.topic.entityIds[0]) {
    raw.push(
      hubSuggestion(
        `All ${brand.topic.label} EVs`,
        brand.topic.href,
        {
          source: 'structural_entity',
          refs: ['entity:brand', 'hub_taxonomy']
        },
        brand.topic.entityIds[0]
      )
    );
  } else {
    raw.push(
      hubSuggestion(
        'Browse EVs',
        evsIndexHref(),
        {
          source: 'hub_taxonomy',
          refs: ['site_hub:evs']
        },
        'site_hub:evs'
      )
    );
  }

  const model = memberships.find((m) => m.topic.kind === 'model' && m.topic.href);
  if (
    model?.topic.href &&
    model.topic.href !== opts?.excludeModelHref &&
    model.topic.entityIds[0]
  ) {
    raw.push(
      hubSuggestion(
        `${model.topic.label} overview`,
        model.topic.href,
        {
          source: 'structural_entity',
          refs: ['entity:model', 'hub_taxonomy']
        },
        model.topic.entityIds[0]
      )
    );
  }

  // The pillar of a model page is that model — emitting it would self-link the current page.
  if (
    opts?.pillar?.href &&
    normalizeDestinationHref(opts.pillar.href) !==
      normalizeDestinationHref(opts?.excludeModelHref)
  ) {
    raw.push(
      hubSuggestion(
        opts.pillar.label,
        opts.pillar.href,
        {
          source: 'hub_taxonomy',
          refs: ['pillar', opts.pillar.id]
        },
        pillarTargetEntityId(opts.pillar)
      )
    );
  }

  const variantId = (opts?.selectedVariantId || '').trim();
  if (variantId) {
    raw.push(
      hubSuggestion(
        'Compare this EV',
        compareHref([variantId]),
        {
          source: 'structural_entity',
          refs: ['variant', 'compareHref']
        },
        `variant:${variantId}`
      )
    );
  }

  raw.push(
    hubSuggestion(
      'EV articles & guides',
      articlesIndexHref(),
      {
        source: 'hub_taxonomy',
        refs: ['site_hub:articles']
      },
      'site_hub:articles'
    )
  );
  raw.push(
    hubSuggestion(
      'EVCorn FAQs',
      faqsHref(),
      {
        source: 'hub_taxonomy',
        refs: ['site_hub:faqs']
      },
      'site_hub:faqs'
    )
  );

  if (
    opts?.includeEnergy ||
    memberships.some((m) => m.topic.id === 'topic:site_hub:energy')
  ) {
    raw.push(
      hubSuggestion(
        'Energy & charging',
        energyHref(),
        {
          source: 'hub_taxonomy',
          refs: ['site_hub:energy', 'facet_membership']
        },
        'site_hub:energy'
      )
    );
  }

  return canonicalLinkSuggestions(raw);
}

/**
 * Contextual / related-reading link suggestions from graph-backed related plan.
 * Only items already in the related slate / compare edges (proven). Caps ≤8.
 */
export function suggestContextualLinks(
  relatedReading: RelatedReadingPlan,
  opts?: {
    excludeEntityIds?: Iterable<string>;
    /** @deprecated Prefer excludeEntityIds — kept for hub/href overlap checks. */
    excludeHrefs?: Iterable<string>;
  }
): LinkSuggestion[] {
  const links = linkSuggestionsFromRelatedReading(relatedReading, {
    excludeEntityIds: opts?.excludeEntityIds
  });
  if (!opts?.excludeHrefs) return links;
  const excludedHrefs = new Set(
    [...opts.excludeHrefs].map((h) => (h || '').trim()).filter(Boolean)
  );
  if (!excludedHrefs.size) return links;
  return canonicalLinkSuggestions(
    links.filter((l) => !excludedHrefs.has(l.href)),
    links.map((l) => l.targetEntityId)
  );
}

/** Drop suggestions that lack evidence, href, or canonical target; then canonicalize. */
export function filterProvenLinkSuggestions(
  suggestions: LinkSuggestion[]
): LinkSuggestion[] {
  return canonicalLinkSuggestions(suggestions.filter(isValidLinkSuggestion));
}

/** Brand browse via entity-href when brand name is known (never invent slug from id alone). */
export function brandHubSuggestion(
  brandName: string | null | undefined,
  brandEntityId?: string
): LinkSuggestion | null {
  const name = (brandName || '').trim();
  const entityId = (brandEntityId || '').trim();
  if (!name || !entityId) return null;
  return {
    label: `All ${name} EVs`,
    href: brandBrowseHref(name),
    targetEntityId: entityId,
    relKind: 'hub',
    evidence: {
      source: 'structural_entity',
      refs: ['entity:brand', 'brandBrowseHref']
    }
  };
}
