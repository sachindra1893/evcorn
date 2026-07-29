/**
 * Shared observability constants (Phase 2).
 * Thresholds are intentionally conservative so production stays quiet.
 */

/** Client-side slow HTTP request threshold (ms). */
export const SLOW_HTTP_THRESHOLD_MS = 3000;

/** Client-side slow Angular route navigation threshold (ms). */
export const SLOW_ROUTE_THRESHOLD_MS = 2000;

/** Header name for end-to-end correlation (matches backend middleware). */
export const REQUEST_ID_HEADER = 'X-Request-Id';

/** Generate a UUID suitable for X-Request-Id (crypto.randomUUID when available). */
export function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older environments / tests without crypto.randomUUID.
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
