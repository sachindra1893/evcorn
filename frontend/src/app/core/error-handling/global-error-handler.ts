import { ErrorHandler, Injectable, inject, isDevMode } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DiagnosticsService } from '../diagnostics/diagnostics.service';
import { AppNotificationService } from './app-notification.service';

/**
 * Global application-level error boundary (Phase 1 Task 1 + Phase 2 diagnostics).
 * Catches uncaught synchronous exceptions and unhandled promise rejections,
 * emits a structured diagnostic (no stack to analytics in prod), and shows a
 * small non-blocking notice — never touches already-rendered DOM.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly diagnostics = inject(DiagnosticsService);
  private readonly notifications = inject(AppNotificationService);

  handleError(error: unknown): void {
    // HTTP errors already flow through the centralized interceptor (which
    // logs them) and are handled inline by each view's own error/empty
    // state — reporting them here too would double-log and pop a confusing
    // global banner for something the page already handles gracefully.
    if (this.isHttpError(error)) return;

    this.diagnostics.unexpectedException('Unhandled application error', this.normalize(error));

    this.notifications.show({
      message: 'Something unexpected happened on this page. If it looks broken, try refreshing.',
      actionLabel: 'Refresh',
      action: () => {
        if (typeof window !== 'undefined') window.location.reload();
      }
    });
  }

  private isHttpError(error: unknown): boolean {
    const unwrapped = this.unwrap(error);
    return unwrapped instanceof HttpErrorResponse;
  }

  private unwrap(error: unknown): unknown {
    // Angular wraps errors thrown inside promises/zones as { rejection }.
    return (error as { rejection?: unknown })?.rejection ?? error;
  }

  private normalize(error: unknown): Record<string, unknown> {
    const unwrapped = this.unwrap(error);
    if (unwrapped instanceof Error) {
      const ctx: Record<string, unknown> = {
        name: unwrapped.name,
        message: unwrapped.message,
        what: unwrapped.message,
        where: typeof window !== 'undefined' ? window.location.pathname : undefined,
        why: unwrapped.name
      };
      // Stacks stay in the browser console via LoggingService in dev only;
      // production sanitize strips them from beacons.
      if (isDevMode()) {
        ctx['stack'] = unwrapped.stack;
      }
      return ctx;
    }
    return {
      value: String(unwrapped),
      what: String(unwrapped),
      where: typeof window !== 'undefined' ? window.location.pathname : undefined
    };
  }
}
