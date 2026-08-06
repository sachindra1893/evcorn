import { ContentIntelPageModel } from './content-intel.types';

/**
 * In-memory ContentIntelPageModel LRU keyed by entityId + version stamp.
 * Caches derived packs only — never HTML, never CMS writes, never network.
 * Max ≤64 (mirror aeo-cache / entity-cache).
 */
const MAX_ENTRIES = 64;
const store = new Map<string, ContentIntelPageModel>();

export const CONTENT_INTEL_CACHE_MAX_ENTRIES = MAX_ENTRIES;

export function contentIntelCacheKey(entityId: string, version: string): string {
  return `${entityId}|${version || ''}`;
}

export function getCachedContentIntel(
  entityId: string,
  version: string
): ContentIntelPageModel | undefined {
  const key = contentIntelCacheKey(entityId, version);
  const hit = store.get(key);
  if (!hit) return undefined;
  store.delete(key);
  store.set(key, hit);
  return hit;
}

export function setCachedContentIntel(
  entityId: string,
  version: string,
  model: ContentIntelPageModel
): void {
  const key = contentIntelCacheKey(entityId, version);
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
export function clearContentIntelCache(): void {
  store.clear();
}

export function contentIntelCacheSize(): number {
  return store.size;
}
