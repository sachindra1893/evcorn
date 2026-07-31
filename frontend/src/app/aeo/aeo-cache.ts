import { AeoPageModel } from './aeo.types';

/**
 * In-memory AeoPageModel cache keyed by entityId + updatedAt only.
 * Never caches HTML. Invalidates naturally when updatedAt changes.
 * Bounded LRU eviction — prevents unbounded growth across SPA navigations.
 */
const MAX_ENTRIES = 64;
const store = new Map<string, AeoPageModel>();

export const AEO_CACHE_MAX_ENTRIES = MAX_ENTRIES;

export function aeoCacheKey(entityId: string, updatedAt: string): string {
  return `${entityId}|${updatedAt || ''}`;
}

export function getCachedAeo(entityId: string, updatedAt: string): AeoPageModel | undefined {
  const key = aeoCacheKey(entityId, updatedAt);
  const hit = store.get(key);
  if (!hit) return undefined;
  // Refresh LRU order: delete + re-insert moves to newest.
  store.delete(key);
  store.set(key, hit);
  return hit;
}

export function setCachedAeo(entityId: string, updatedAt: string, model: AeoPageModel): void {
  const key = aeoCacheKey(entityId, updatedAt);
  if (store.has(key)) store.delete(key);
  store.set(key, model);
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
export function clearAeoCache(): void {
  store.clear();
}

export function aeoCacheSize(): number {
  return store.size;
}
