import { Injectable, inject } from '@angular/core';
import { LoggingService } from '../logging/logging.service';
import {
  DiagnosticContext,
  DiagnosticEventType,
  diagnosticKindFromHttp
} from './diagnostic.types';
import type { AppHttpError } from '../http/app-http-error';

export interface HttpFailureExtras {
  requestId?: string;
  durationMs?: number;
  route?: string;
  endpoint?: string;
  method?: string;
  what?: string;
  where?: string;
  why?: string;
}

/**
 * Centralized production diagnostics hub (Phase 2).
 * Emits structured diagnostic events through LoggingService — no UI changes,
 * no duplicate user-facing notices. Call sites that already log via the
 * interceptor / GlobalErrorHandler should prefer this so field names stay
 * consistent (requestId, durationMs, route, endpoint, kind).
 */
@Injectable({ providedIn: 'root' })
export class DiagnosticsService {
  private readonly logging = inject(LoggingService);

  /** HTTP terminal failure (network / timeout / 4xx / 5xx). */
  httpFailure(message: string, classified: AppHttpError, extras: HttpFailureExtras = {}): void {
    const kind = diagnosticKindFromHttp(classified.category, classified.status);
    let eventType: DiagnosticEventType = 'http_failure';
    if (kind === 'network_offline' || kind === 'network') {
      eventType = 'network_failure';
    } else if (kind === 'timeout') {
      eventType = 'timeout';
    }

    const requestId = classified.requestId ?? extras.requestId;
    const what = extras.what ?? message;
    const where = extras.where ?? extras.endpoint;
    const why = extras.why ?? classified.code ?? classified.category;

    this.emit('error', message, {
      eventType,
      kind,
      category: classified.category,
      status: classified.status,
      code: classified.code,
      requestId,
      what,
      where,
      why,
      durationMs: extras.durationMs,
      route: extras.route,
      endpoint: extras.endpoint,
      method: extras.method
    });
  }

  /** Client-observed slow API response (does not change UX). */
  httpSlow(message: string, context: DiagnosticContext = {}): void {
    this.emit('warn', message, {
      eventType: 'http_slow',
      kind: 'slow_request',
      requestId: context.requestId,
      durationMs: context.durationMs,
      route: context.route,
      endpoint: context.endpoint,
      method: context.method,
      status: context.status,
      code: context.code,
      what: context.what,
      where: context.where,
      why: context.why
    });
  }

  /** Suspected backend cold-start (aligned with Phase 1 waking banner signal). */
  coldStart(message: string, context: DiagnosticContext = {}): void {
    this.emit('warn', message, {
      eventType: 'cold_start',
      kind: 'cold_start',
      requestId: context.requestId,
      durationMs: context.durationMs,
      route: context.route,
      endpoint: context.endpoint,
      method: context.method,
      status: context.status,
      what: context.what,
      where: context.where,
      why: context.why
    });
  }

  /** Retry attempt (dev-visible; warn level). */
  retry(message: string, context: DiagnosticContext = {}): void {
    this.emit('warn', message, {
      eventType: 'retry',
      requestId: context.requestId,
      endpoint: context.endpoint,
      method: context.method,
      status: context.status
    });
  }

  /** Router navigation failure (chunk load / activation). */
  routeFailure(message: string, context: DiagnosticContext = {}): void {
    this.emit('error', message, {
      eventType: 'route_failure',
      kind: 'route_failure',
      durationMs: context.durationMs,
      route: context.route,
      what: context.what,
      where: context.where,
      why: context.why
    });
  }

  /** Successful navigation timing (info in dev, quiet in prod via LoggingService). */
  routeTiming(message: string, context: DiagnosticContext = {}): void {
    this.emit('info', message, {
      eventType: 'route_timing',
      durationMs: context.durationMs,
      route: context.route,
      what: context.what,
      where: context.where,
      why: context.why
    });
  }

  /** Uncaught exception / unhandled rejection (GlobalErrorHandler). */
  unexpectedException(message: string, context: Record<string, unknown> = {}): void {
    const entry: DiagnosticContext = {
      eventType: 'unexpected_exception',
      kind: 'unexpected_exception',
      what: typeof context['what'] === 'string' ? context['what'] : undefined,
      where: typeof context['where'] === 'string' ? context['where'] : undefined,
      why: typeof context['why'] === 'string' ? context['why'] : undefined
    };
    // Pass full context to logging (name/message/stack) without widening DiagnosticContext.
    this.logging.error(message, {
      ...entry,
      route: entry.route ?? currentPath(),
      ...context
    });
  }

  private emit(
    level: 'info' | 'warn' | 'error',
    message: string,
    context: DiagnosticContext
  ): void {
    const entry: DiagnosticContext = {
      ...context,
      route: context.route ?? currentPath()
    };

    if (level === 'error') {
      this.logging.error(message, entry as Record<string, unknown>);
    } else if (level === 'warn') {
      this.logging.warn(message, entry as Record<string, unknown>);
    } else {
      this.logging.info(message, entry as Record<string, unknown>);
    }
  }
}

function currentPath(): string | undefined {
  return typeof window !== 'undefined' ? window.location.pathname : undefined;
}

export { diagnosticKindFromHttp } from './diagnostic.types';
export type { DiagnosticKind, DiagnosticEventType, DiagnosticContext } from './diagnostic.types';
