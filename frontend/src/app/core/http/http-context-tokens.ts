import { HttpContextToken } from '@angular/common/http';

/**
 * Per-request overrides for the centralized httpErrorInterceptor. Call sites
 * opt out/in explicitly instead of every page re-implementing its own
 * timeout/retry logic.
 */

/** Override the default timeout (ms). Defaults: 20s for GET/HEAD, 30s otherwise. */
export const HTTP_TIMEOUT_MS = new HttpContextToken<number | null>(() => null);

/** Disable the interceptor's bounded retry entirely for this request. */
export const DISABLE_HTTP_RETRY = new HttpContextToken<boolean>(() => false);

/** Allow bounded retry for a non-idempotent (mutating) request. Off by default. */
export const ALLOW_RETRY_ON_MUTATION = new HttpContextToken<boolean>(() => false);

/**
 * Skip the interceptor's central error logging for this request. Used by the
 * logging beacon itself so a failed beacon POST can never recursively log
 * another error and loop.
 */
export const SKIP_CENTRAL_ERROR_LOGGING = new HttpContextToken<boolean>(() => false);
