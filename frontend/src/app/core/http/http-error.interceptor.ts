import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, timer } from 'rxjs';
import { catchError, finalize, retry, tap, timeout } from 'rxjs/operators';
import { DiagnosticsService } from '../diagnostics/diagnostics.service';
import { NetworkStatusService } from '../network/network-status.service';
import {
  REQUEST_ID_HEADER,
  SLOW_HTTP_THRESHOLD_MS,
  createRequestId
} from '../observability/observability.constants';
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
 * The single centralized HTTP interceptor (Phase 1 reliability + Phase 2 observability).
 * Every HttpClient call passes through here exactly once:
 *   1. Attach / propagate X-Request-Id for end-to-end correlation.
 *   2. Apply a bounded timeout so nothing waits forever.
 *   3. Retry ONLY transient failures on idempotent requests, with
 *      exponential backoff — never 400/401/403/404/422/429 and
 *      never mutating requests unless explicitly opted in.
 *   4. Measure duration; warn on slow responses; log terminal failures
 *      via DiagnosticsService (structured fields, no UI change).
 *   5. Surface a "backend waking up" signal while retrying (Phase 1 UX).
 *
 * Deliberately rethrows the ORIGINAL error unchanged (not a classified
 * AppHttpError) so every existing `.subscribe({ error })` call site across
 * the app keeps working exactly as before — classification is opt-in via
 * `classifyHttpError()` / `toAsyncState()` for new code, not forced globally.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const diagnostics = inject(DiagnosticsService);
  const network = inject(NetworkStatusService);

  const existingId = req.headers.get(REQUEST_ID_HEADER) ?? req.headers.get('x-request-id');
  const requestId = existingId || createRequestId();
  const correlatedReq = existingId
    ? req
    : req.clone({ setHeaders: { [REQUEST_ID_HEADER]: requestId } });

  const isIdempotent = IDEMPOTENT_METHODS.has(correlatedReq.method);
  const retryAllowed =
    !correlatedReq.context.get(DISABLE_HTTP_RETRY) &&
    (isIdempotent || correlatedReq.context.get(ALLOW_RETRY_ON_MUTATION));
  const timeoutMs =
    correlatedReq.context.get(HTTP_TIMEOUT_MS) ??
    (isIdempotent ? DEFAULT_GET_TIMEOUT_MS : DEFAULT_MUTATION_TIMEOUT_MS);
  const skipLogging = correlatedReq.context.get(SKIP_CENTRAL_ERROR_LOGGING);

  let didRetry = false;
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const withTimeout$ = next(correlatedReq).pipe(timeout({ each: timeoutMs }));

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
              if (!skipLogging) {
                diagnostics.coldStart(`Suspected backend cold-start while retrying ${correlatedReq.method} ${correlatedReq.urlWithParams}`, {
                  requestId,
                  method: correlatedReq.method,
                  endpoint: correlatedReq.urlWithParams,
                  status: error instanceof HttpErrorResponse ? error.status : undefined,
                  what: 'Transient failure during idempotent request',
                  where: correlatedReq.urlWithParams,
                  why: 'Backend may be waking from idle (cold start)'
                });
              }
            }
            if (!skipLogging) {
              diagnostics.retry(
                `Retrying ${correlatedReq.method} ${correlatedReq.urlWithParams} (attempt ${retryCount}/${MAX_RETRIES})`,
                {
                  requestId,
                  method: correlatedReq.method,
                  endpoint: correlatedReq.urlWithParams,
                  status: error instanceof HttpErrorResponse ? error.status : undefined
                }
              );
            }
            const backoffMs = readRetryAfterMs(error) ?? BASE_BACKOFF_MS * 2 ** (retryCount - 1);
            return timer(backoffMs);
          }
        })
      )
    : withTimeout$;

  return withRetry$.pipe(
    tap((event) => {
      if (skipLogging || !(event instanceof HttpResponse)) return;
      const durationMs = Math.round(
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
      );
      if (durationMs >= SLOW_HTTP_THRESHOLD_MS) {
        diagnostics.httpSlow(
          `Slow API response ${correlatedReq.method} ${correlatedReq.urlWithParams} (${durationMs}ms)`,
          {
            requestId:
              event.headers.get(REQUEST_ID_HEADER) ??
              event.headers.get('x-request-id') ??
              requestId,
            durationMs,
            method: correlatedReq.method,
            endpoint: correlatedReq.urlWithParams,
            status: event.status,
            what: 'API response exceeded slow threshold',
            where: correlatedReq.urlWithParams,
            why: `durationMs=${durationMs} >= ${SLOW_HTTP_THRESHOLD_MS}`
          }
        );
      }
    }),
    finalize(() => {
      if (didRetry) network.endBackendWaking();
    }),
    catchError((err) => {
      if (!skipLogging) {
        const durationMs = Math.round(
          (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
        );
        const classified = classifyHttpError(err, network.isOnline(), requestId);
        diagnostics.httpFailure(`${correlatedReq.method} ${correlatedReq.urlWithParams} failed`, classified, {
          requestId: classified.requestId ?? requestId,
          durationMs,
          method: correlatedReq.method,
          endpoint: correlatedReq.urlWithParams,
          what: `${correlatedReq.method} ${correlatedReq.urlWithParams} failed`,
          where: correlatedReq.urlWithParams,
          why: classified.code ?? classified.category
        });
      }
      return throwError(() => err);
    })
  );
};
