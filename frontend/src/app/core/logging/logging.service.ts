import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { getApiBaseUrl } from '../http/api-base-url';
import { DISABLE_HTTP_RETRY, HTTP_TIMEOUT_MS, SKIP_CENTRAL_ERROR_LOGGING } from '../http/http-context-tokens';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

/** Canonical structured log fields (align with backend logger where sensible). */
export interface StructuredLogEntry {
  level: LogLevel;
  time: string;
  msg: string;
  service: 'evcorn-frontend';
  requestId?: string;
  durationMs?: number;
  route?: string;
  endpoint?: string;
  method?: string;
  status?: number;
  code?: string;
  kind?: string;
  eventType?: string;
  category?: string;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = /^(password|secret|token|authorization|cookie|api[_-]?key)$/i;

/**
 * Centralized structured logging (Phase 2).
 * - Dev: verbose debug/info/warn + human-readable lines with structured payload
 * - Prod: quieter (errors always; warns for diagnostics worth surfacing); never
 *   beacons full stacks or sensitive fields to analytics
 * Logging must never throw or block the caller.
 */
@Injectable({ providedIn: 'root' })
export class LoggingService {
  constructor(private readonly http: HttpClient) {}

  debug(message: string, context?: LogContext): void {
    if (isDevMode()) {
      this.write('debug', message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (isDevMode()) {
      this.write('info', message, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    // Warns are useful in production for slow requests / cold-start suspicion,
    // but stay quieter than errors (no beacon).
    this.write('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.write('error', message, context);
    this.beacon(message, context);
  }

  /** Build a structured entry (exported for tests). */
  buildEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    options: { stripStack?: boolean } = {}
  ): StructuredLogEntry {
    const sanitized = this.sanitize(context, { stripStack: options.stripStack === true });
    const entry: StructuredLogEntry = {
      level,
      time: new Date().toISOString(),
      msg: message,
      service: 'evcorn-frontend',
      ...sanitized
    };

    // Prefer requestId over legacy reqId if both somehow appear.
    if (entry['reqId'] && !entry.requestId) {
      entry.requestId = String(entry['reqId']);
      delete entry['reqId'];
    }

    return entry;
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    try {
      // Keep stacks in the developer console; beacon path strips them separately.
      const entry = this.buildEntry(level, message, context, { stripStack: false });
      const line = `[EVCorn][${level}] ${message}`;
      const payload = entry;

      switch (level) {
        case 'debug':
          console.debug(line, payload);
          break;
        case 'info':
          console.info(line, payload);
          break;
        case 'warn':
          console.warn(line, payload);
          break;
        case 'error':
          console.error(line, payload);
          break;
      }
    } catch {
      // Logging must never throw.
    }
  }

  private beacon(message: string, context?: LogContext): void {
    try {
      const context$ = new HttpContext()
        .set(DISABLE_HTTP_RETRY, true)
        .set(SKIP_CENTRAL_ERROR_LOGGING, true)
        .set(HTTP_TIMEOUT_MS, 5000);

      const metadata = this.sanitize(context, { stripStack: true });

      this.http
        .post(
          `${getApiBaseUrl()}/analytics/event`,
          {
            eventName: 'client_error',
            metadata: {
              message,
              ...metadata,
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

  /**
   * Deep-clone via JSON, redact sensitive keys, optionally strip stacks
   * (production / beacon path — never leak stacks to analytics or end users).
   */
  sanitize(context?: LogContext, options: { stripStack?: boolean } = {}): LogContext {
    if (!context) return {};
    try {
      const cloned = JSON.parse(JSON.stringify(context)) as LogContext;
      return this.redact(cloned, options.stripStack === true);
    } catch {
      return { note: 'context not serializable' };
    }
  }

  private redact(value: unknown, stripStack: boolean): LogContext {
    if (value === null || typeof value !== 'object') {
      return {};
    }
    if (Array.isArray(value)) {
      return { items: value.map((item) =>
        item !== null && typeof item === 'object' ? this.redact(item, stripStack) : item
      ) };
    }

    const out: LogContext = {};
    for (const [key, raw] of Object.entries(value as LogContext)) {
      if (SENSITIVE_KEYS.test(key)) {
        out[key] = '[REDACTED]';
        continue;
      }
      if (stripStack && key === 'stack') {
        continue;
      }
      if (raw !== null && typeof raw === 'object') {
        out[key] = Array.isArray(raw)
          ? raw.map((item) =>
              item !== null && typeof item === 'object' ? this.redact(item, stripStack) : item
            )
          : this.redact(raw, stripStack);
      } else {
        out[key] = raw;
      }
    }
    return out;
  }
}
