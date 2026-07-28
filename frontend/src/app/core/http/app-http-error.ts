import { HttpErrorResponse } from '@angular/common/http';

export type ErrorCategory =
  | 'network'
  | 'timeout'
  | 'client'
  | 'server'
  | 'auth'
  | 'rateLimit'
  | 'offline'
  | 'unknown';

export interface AppHttpError {
  category: ErrorCategory;
  status: number;
  code?: string;
  userMessage: string;
  retryable: boolean;
  originalError: unknown;
}

/** Statuses considered transient/worth an automatic retry. */
const RETRYABLE_STATUSES = new Set([0, 502, 503, 504]);

export function isTransientStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(status);
}

function backendErrorCode(err: HttpErrorResponse): string | undefined {
  const body = err.error;
  return body && typeof body === 'object' ? body?.error?.code : undefined;
}

/**
 * Professional, human, actionable copy per category (Task 12) - never the
 * generic "Something went wrong."
 */
function messageFor(category: ErrorCategory, status: number): string {
  switch (category) {
    case 'offline':
      return "You appear to be offline. We'll keep trying automatically once you're back online.";
    case 'network':
      return 'Unable to reach EVCorn right now. Please check your connection and try again.';
    case 'timeout':
      return 'This is taking longer than expected. Please try again in a few moments.';
    case 'auth':
      return 'Your session has expired. Please sign in again to continue.';
    case 'rateLimit':
      return "You're doing that a bit too fast. Please wait a moment and try again.";
    case 'client':
      return status === 404
        ? 'We could not find what you were looking for.'
        : 'That request could not be completed. Please check your input and try again.';
    case 'server':
      return 'Unable to load this content right now. Please try again in a few moments.';
    default:
      return 'Something unexpected happened. Please try again.';
  }
}

/**
 * Classifies any error that can come out of an HttpClient call into a
 * normalized shape with a professional user-facing message and a retryable
 * flag. Never throws.
 */
export function classifyHttpError(err: unknown, isOnline: boolean): AppHttpError {
  if (!isOnline) {
    return { category: 'offline', status: 0, userMessage: messageFor('offline', 0), retryable: true, originalError: err };
  }

  if (err instanceof HttpErrorResponse) {
    const status = err.status;
    const code = backendErrorCode(err);

    if (status === 0) {
      return { category: 'network', status, code, userMessage: messageFor('network', status), retryable: true, originalError: err };
    }
    if (status === 401 || status === 403) {
      return { category: 'auth', status, code, userMessage: messageFor('auth', status), retryable: false, originalError: err };
    }
    if (status === 429) {
      return { category: 'rateLimit', status, code, userMessage: messageFor('rateLimit', status), retryable: false, originalError: err };
    }
    if (status === 408) {
      return { category: 'timeout', status, code, userMessage: messageFor('timeout', status), retryable: true, originalError: err };
    }
    if (status >= 500) {
      return { category: 'server', status, code, userMessage: messageFor('server', status), retryable: isTransientStatus(status), originalError: err };
    }
    if (status >= 400) {
      return { category: 'client', status, code, userMessage: messageFor('client', status), retryable: false, originalError: err };
    }
  }

  // RxJS TimeoutError (from the interceptor's timeout()) has name 'TimeoutError'
  // but isn't an HttpErrorResponse.
  if (err && typeof err === 'object' && (err as { name?: string }).name === 'TimeoutError') {
    return { category: 'timeout', status: 0, userMessage: messageFor('timeout', 0), retryable: true, originalError: err };
  }

  return { category: 'unknown', status: 0, userMessage: messageFor('unknown', 0), retryable: false, originalError: err };
}
