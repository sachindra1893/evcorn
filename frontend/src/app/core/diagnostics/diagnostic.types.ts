import type { ErrorCategory } from '../http/app-http-error';

/**
 * Diagnostic taxonomy used in observability logs (Phase 2).
 * Maps onto Phase 1 ErrorCategory for UX without changing user-facing copy.
 */
export type DiagnosticKind =
  | 'network_offline'
  | 'network'
  | 'timeout'
  | 'backend_5xx'
  | 'not_found'
  | 'validation'
  | 'auth'
  | 'rate_limit'
  | 'client'
  | 'route_failure'
  | 'unexpected_exception'
  | 'slow_request'
  | 'cold_start'
  | 'unknown';

export type DiagnosticEventType =
  | 'http_failure'
  | 'http_slow'
  | 'network_failure'
  | 'timeout'
  | 'route_failure'
  | 'route_timing'
  | 'unexpected_exception'
  | 'cold_start'
  | 'retry';

/**
 * Structured fields attached to every diagnostic log when applicable.
 * Keep serializable — no Error objects, no circular refs.
 * (No string index signature: it would poison known property types under
 * `noPropertyAccessFromIndexSignature`.)
 */
export interface DiagnosticContext {
  kind?: DiagnosticKind;
  eventType?: DiagnosticEventType;
  requestId?: string;
  durationMs?: number;
  route?: string;
  endpoint?: string;
  method?: string;
  status?: number;
  code?: string;
  category?: ErrorCategory;
  what?: string;
  where?: string;
  why?: string;
}

/** Map Phase 1 HTTP error categories into Phase 2 diagnostic kinds. */
export function diagnosticKindFromHttp(
  category: ErrorCategory,
  status: number
): DiagnosticKind {
  switch (category) {
    case 'offline':
      return 'network_offline';
    case 'network':
      return 'network';
    case 'timeout':
      return 'timeout';
    case 'server':
      return 'backend_5xx';
    case 'auth':
      return 'auth';
    case 'rateLimit':
      return 'rate_limit';
    case 'client':
      if (status === 404) return 'not_found';
      if (status === 400 || status === 422) return 'validation';
      return 'client';
    default:
      return 'unknown';
  }
}
