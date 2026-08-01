import { articleHref } from '../../entity/entity-href';
import { AeoRelatedArticle, AeoRelatedArticleInput } from '../aeo.types';

const MAX_RELATED = 4;

/**
 * Map pre-fetched related article DTOs → Aeo related links.
 * Prefer resolved DTOs from relationships / RecommendationService at the wire layer.
 * Hrefs via entity-href SSOT (Phase 7.3 M1).
 */
export function generateRelatedArticles(
  related: AeoRelatedArticleInput[] | null | undefined,
  opts?: { excludeId?: string }
): AeoRelatedArticle[] {
  if (!related?.length) return [];

  const out: AeoRelatedArticle[] = [];
  const seen = new Set<string>();

  for (const item of related) {
    if (out.length >= MAX_RELATED) break;
    const id = item.id?.trim();
    const title = item.title?.trim();
    if (!id || !title || id === opts?.excludeId) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    const href = articleHref(id);
    if (!href) continue;
    out.push({ id, title, href });
  }

  return out;
}

/** Collect related article ids from article relationships + `related` blocks. */
export function collectRelatedArticleIds(
  relationshipIds: string[] | null | undefined,
  blocks: Array<{ type: string; data?: Record<string, unknown> }> | null | undefined
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const id of relationshipIds || []) {
    if (typeof id !== 'string' || !id.trim() || seen.has(id)) continue;
    seen.add(id);
    ids.push(id.trim());
  }

  for (const block of blocks || []) {
    if (block.type !== 'related') continue;
    const raw = block.data?.['articleIds'];
    if (!Array.isArray(raw)) continue;
    for (const id of raw) {
      if (typeof id !== 'string' || !id.trim() || seen.has(id)) continue;
      seen.add(id);
      ids.push(id.trim());
    }
  }

  return ids;
}
