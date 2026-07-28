import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { getApiBaseUrl } from '../http/api-base-url';
import { DISABLE_HTTP_RETRY, HTTP_TIMEOUT_MS, SKIP_CENTRAL_ERROR_LOGGING } from '../http/http-context-tokens';

export type LogContext = Record<string, unknown>;

/**
 * Centralized logging: verbose in development, quiet in production, and
 * every error additionally does a best-effort, fire-and-forget beacon to the
 * backend's existing (schema-less) analytics endpoint for minimal
 * server-side visibility. Logging must never throw or block the caller.
 */
@Injectable({ providedIn: 'root' })
export class LoggingService {
  constructor(private readonly http: HttpClient) {}

  debug(message: string, context?: LogContext): void {
    if (isDevMode()) {
      console.debug(`[EVCorn][debug] ${message}`, context ?? '');
    }
  }

  info(message: string, context?: LogContext): void {
    if (isDevMode()) {
      console.info(`[EVCorn][info] ${message}`, context ?? '');
    }
  }

  warn(message: string, context?: LogContext): void {
    if (isDevMode()) {
      console.warn(`[EVCorn][warn] ${message}`, context ?? '');
    }
  }

  error(message: string, context?: LogContext): void {
    // Errors stay visible in production too (this is "clean", not silent) -
    // only the verbose debug/info/warn streams are dev-only.
    console.error(`[EVCorn][error] ${message}`, context ?? '');
    this.beacon(message, context);
  }

  private beacon(message: string, context?: LogContext): void {
    try {
      const context$ = new HttpContext()
        .set(DISABLE_HTTP_RETRY, true)
        .set(SKIP_CENTRAL_ERROR_LOGGING, true)
        .set(HTTP_TIMEOUT_MS, 5000);

      this.http
        .post(
          `${getApiBaseUrl()}/analytics/event`,
          {
            eventName: 'client_error',
            metadata: {
              message,
              ...this.sanitize(context),
              path: typeof window !== 'undefined' ? window.location.pathname : undefined
            }
          },
          { context: context$ }
        )
        .subscribe({ error: () => { /* Best-effort only - never surfaces. */ } });
    } catch {
      // Logging must never throw.
    }
  }

  private sanitize(context?: LogContext): LogContext {
    if (!context) return {};
    try {
      return JSON.parse(JSON.stringify(context));
    } catch {
      return { note: 'context not serializable' };
    }
  }
}
