import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, timer } from 'rxjs';
import { catchError, finalize, retry, timeout } from 'rxjs/operators';
import { LoggingService } from '../logging/logging.service';
import { NetworkStatusService } from '../network/network-status.service';
import { classifyHttpError, isTransientStatus } from './app-http-error';
import {
  ALLOW_RETRY_ON_MUTATION,
  DISABLE_HTTP_RETRY,
  HTTP_TIMEOUT_MS,
  SKIP_CENTRAL_ERROR_LOGGING
} from './http-context-tokens';

const DEFAULT_GET_TIMEOUT_MS = 20000;
const DEFAULT_MUTATION_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 1000;
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD']);

function isRetryableError(error: unknown): boolean {
  if (error instanceof HttpErrorResponse) return isTransientStatus(error.status);
  return (error as { name?: string } | null)?.name === 'TimeoutError';
}

function readRetryAfterMs(error: unknown): number | null {
  if (error instanceof HttpErrorResponse) {
    const header = error.headers?.get('Retry-After');
    const seconds = header ? Number(header) : NaN;
    if (!Number.isNaN(seconds)) return seconds * 1000;
  }
  return null;
}

/**
 * The single centralized HTTP interceptor (Task 2). Every HttpClient call in
 * the app passes through here exactly once:
 *   1. Apply a bounded timeout so nothing waits forever (Task 3).
 *   2. Retry ONLY transient failures on idempotent requests, with
 *      exponential backoff (Task 4) - never 400/401/403/404/422/429 and
 *      never mutating requests unless explicitly opted in.
 *   3. Log the terminal failure centrally (Task 10) and surface a
 *      "backend waking up" signal while retrying.
 *
 * Deliberately rethrows the ORIGINAL error unchanged (not a classified
 * AppHttpError) so every existing `.subscribe({ error })` call site across
 * the app keeps working exactly as before - classification is opt-in via
 * `classifyHttpError()` / `toAsyncState()` for new code, not forced globally.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const logging = inject(LoggingService);
  const network = inject(NetworkStatusService);

  const isIdempotent = IDEMPOTENT_METHODS.has(req.method);
  const retryAllowed =
    !req.context.get(DISABLE_HTTP_RETRY) && (isIdempotent || req.context.get(ALLOW_RETRY_ON_MUTATION));
  const timeoutMs = req.context.get(HTTP_TIMEOUT_MS) ?? (isIdempotent ? DEFAULT_GET_TIMEOUT_MS : DEFAULT_MUTATION_TIMEOUT_MS);
  const skipLogging = req.context.get(SKIP_CENTRAL_ERROR_LOGGING);

  let didRetry = false;

  const withTimeout$ = next(req).pipe(timeout({ each: timeoutMs }));

  const withRetry$ = retryAllowed
    ? withTimeout$.pipe(
        retry({
          count: MAX_RETRIES,
          delay: (error, retryCount) => {
            if (!isRetryableError(error)) {
              return throwError(() => error);
            }
            if (!didRetry) {
              didRetry = true;
              network.beginBackendWaking();
            }
            if (!skipLogging) {
              logging.warn(`Retrying ${req.method} ${req.urlWithParams} (attempt ${retryCount}/${MAX_RETRIES})`, {
                status: error instanceof HttpErrorResponse ? error.status : undefined
              });
            }
            const backoffMs = readRetryAfterMs(error) ?? BASE_BACKOFF_MS * 2 ** (retryCount - 1);
            return timer(backoffMs);
          }
        })
      )
    : withTimeout$;

  return withRetry$.pipe(
    finalize(() => {
      if (didRetry) network.endBackendWaking();
    }),
    catchError((err) => {
      if (!skipLogging) {
        const classified = classifyHttpError(err, network.isOnline());
        logging.error(`${req.method} ${req.urlWithParams} failed`, {
          category: classified.category,
          status: classified.status,
          code: classified.code
        });
      }
      return throwError(() => err);
    })
  );
};
