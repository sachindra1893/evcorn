import { NavigationError } from '@angular/router';

const CHUNK_LOAD_FAILURE_PATTERN = /Loading chunk|Failed to fetch dynamically imported module|ChunkLoadError/i;

/**
 * Router-level resilience (Phase 1 Task 9): a stale/failed lazy-loaded chunk —
 * classic case being a user on an old tab after a new deploy replaced build
 * hashes — can never succeed within the already-loaded page. The only real
 * fix is a full reload. Diagnostics for navigation failures (with duration)
 * are emitted by RouteTimingService; this handler owns recovery only so we
 * do not double-log.
 *
 * Every other navigation failure (bad route, guard rejection, etc.) is left
 * to the router's own recovery / the existing `**` NotFoundComponent.
 */
export function handleNavigationError(error: NavigationError): void {
  const inner = (error as unknown as { error?: unknown }).error;
  const message = inner instanceof Error ? inner.message : String(inner ?? error);

  if (CHUNK_LOAD_FAILURE_PATTERN.test(message) && typeof window !== 'undefined') {
    window.location.href = error.url;
  }
}
