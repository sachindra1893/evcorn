import { NavigationError } from '@angular/router';

const CHUNK_LOAD_FAILURE_PATTERN = /Loading chunk|Failed to fetch dynamically imported module|ChunkLoadError/i;

/**
 * Router-level resilience (Task 9): a stale/failed lazy-loaded chunk - the
 * classic case being a user sitting on an old tab after a new deploy
 * replaced the build's file hashes - can never succeed within the
 * already-loaded page. The only real fix is a full reload so the browser
 * fetches the current index.html/manifest. Every other navigation failure
 * (bad route, guard rejection, etc.) is left to the router's own recovery /
 * the existing `**` NotFoundComponent so normal navigation keeps working.
 */
export function handleNavigationError(error: NavigationError): void {
  const inner = (error as unknown as { error?: unknown }).error;
  const message = inner instanceof Error ? inner.message : String(inner ?? error);

  console.error('[Navigation] Failed to activate route', error.url, message);

  if (CHUNK_LOAD_FAILURE_PATTERN.test(message) && typeof window !== 'undefined') {
    window.location.href = error.url;
  }
}
