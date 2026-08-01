import { EntityGraph } from './entity.types';

/**
 * In-memory EntityGraph LRU cache keyed by stable entity identity + version stamp.
 * Caches derived graphs only — never HTML, never CMS writes, never Redis/DB.
 * Bounded eviction prevents unbounded growth across SPA navigations.
 */
const MAX_ENTRIES = 64;
const store = new Map<string, EntityGraph>();

export const ENTITY_GRAPH_CACHE_MAX_ENTRIES = MAX_ENTRIES;

/** Key = stable entity id + updatedAt/version (related slate fingerprint when needed). */
export function entityGraphCacheKey(entityId: string, version: string): string {
  return `${entityId}|${version || ''}`;
}

export function getCachedEntityGraph(
  entityId: string,
  version: string
): EntityGraph | undefined {
  const key = entityGraphCacheKey(entityId, version);
  const hit = store.get(key);
  if (!hit) return undefined;
  // Refresh LRU order: delete + re-insert moves to newest.
  store.delete(key);
  store.set(key, hit);
  return hit;
}

export function setCachedEntityGraph(
  entityId: string,
  version: string,
  graph: EntityGraph
): void {
  const key = entityGraphCacheKey(entityId, version);
  if (store.has(key)) store.delete(key);
  store.set(key, graph);
  evictOldestIfNeeded();
}

function evictOldestIfNeeded(): void {
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

/** Test / hot-reload helper — not used by page render paths. */
export function clearEntityGraphCache(): void {
  store.clear();
}

export function entityGraphCacheSize(): number {
  return store.size;
}
