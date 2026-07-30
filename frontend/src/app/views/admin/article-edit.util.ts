import { ArticleBlock } from '../../models/blocks.model';

/** Resolve a stable article id from list/detail payloads (`id` or Mongo `_id`). */
export function resolveArticleId(art: { id?: string; _id?: unknown } | null | undefined): string | null {
  if (!art) return null;
  const raw = art.id ?? art._id;
  if (raw == null || raw === '') return null;
  const id = String(raw).trim();
  return id.length > 0 ? id : null;
}

/**
 * Hydrate the block editor from API payloads.
 * Live articles store blocks as `__EVBLOCKS__…` inside `paragraphs[0]` because
 * the Mongo schema has no `blocks` path — detail pages already deserialize this;
 * admin edit must too or the form looks empty/corrupt and invites re-publish.
 */
export function hydrateArticleBlocks(art: {
  blocks?: ArticleBlock[] | null;
  paragraphs?: string[] | null;
}): ArticleBlock[] {
  if (art.blocks && art.blocks.length > 0) {
    return JSON.parse(JSON.stringify(art.blocks));
  }

  const paragraphs = art.paragraphs || [];
  if (paragraphs.length === 0) {
    return [];
  }

  if (paragraphs[0].startsWith('__EVBLOCKS__')) {
    try {
      const parsed = JSON.parse(paragraphs[0].substring('__EVBLOCKS__'.length));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return JSON.parse(JSON.stringify(parsed));
      }
    } catch {
      // Malformed payload — fall through to plain paragraphs.
    }
  }

  return paragraphs.map((p) => ({
    type: 'paragraph' as const,
    id: Math.random().toString(36).substring(2, 9),
    data: { text: p }
  })) as ArticleBlock[];
}

/**
 * Edit sessions must never fall through to POST create.
 * If edit mode is active but the id was lost, refuse save rather than duplicate.
 */
export function assertArticleUpdateTarget(
  editMode: boolean,
  editingArticleId: string | null
): { ok: true; id: string } | { ok: false; reason: string } {
  if (!editMode) {
    return { ok: false, reason: 'not-editing' };
  }
  if (!editingArticleId) {
    return {
      ok: false,
      reason: 'Edit session lost the article ID. Refresh and try again — refusing to create a duplicate.'
    };
  }
  return { ok: true, id: editingArticleId };
}

/**
 * Replace (or prepend) an article in the admin list so Manage Published Articles
 * reflects the saved title/body without waiting on a full refetch.
 */
export function upsertArticleInList<T extends { id?: string; _id?: unknown; title?: string }>(
  articles: T[],
  updated: T
): T[] {
  const id = resolveArticleId(updated);
  if (!id) {
    return articles.slice();
  }

  const next = articles.slice();
  const idx = next.findIndex((a) => resolveArticleId(a) === id);
  const merged = { ...((idx >= 0 ? next[idx] : {}) as T), ...updated, id } as T;

  if (idx >= 0) {
    next[idx] = merged;
  } else {
    next.unshift(merged);
  }
  return next;
}
