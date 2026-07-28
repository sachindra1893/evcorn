import { ErrorHandler, Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { LoggingService } from '../logging/logging.service';
import { AppNotificationService } from './app-notification.service';

/**
 * Global application-level error boundary (Task 1). Catches every uncaught
 * synchronous exception and unhandled promise rejection Angular routes
 * here, logs it centrally, and shows a small non-blocking notice - it never
 * touches the DOM the app has already rendered, so one broken component
 * can't white-screen the whole page.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logging = inject(LoggingService);
  private readonly notifications = inject(AppNotificationService);

  handleError(error: unknown): void {
    // HTTP errors already flow through the centralized interceptor (which
    // logs them) and are handled inline by each view's own error/empty
    // state - reporting them here too would double-log and pop a confusing
    // global banner for something the page already handles gracefully.
    if (this.isHttpError(error)) return;

    this.logging.error('Unhandled application error', this.normalize(error));

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
      return { name: unwrapped.name, message: unwrapped.message, stack: unwrapped.stack };
    }
    return { value: String(unwrapped) };
  }
}
