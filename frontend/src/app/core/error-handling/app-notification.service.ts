import { Injectable, signal } from '@angular/core';

export interface AppNotice {
  message: string;
  actionLabel?: string;
  action?: () => void;
}

/**
 * Tiny signal-based holder for the current global fallback notice, shown as
 * a small non-blocking banner in app.html (never replaces already-rendered
 * page content - that's the whole point of "never white-screen").
 */
@Injectable({ providedIn: 'root' })
export class AppNotificationService {
  private readonly notice = signal<AppNotice | null>(null);
  private lastShownAt = 0;
  private readonly MIN_INTERVAL_MS = 8000;

  readonly current = this.notice.asReadonly();

  show(notice: AppNotice): void {
    // Rate-limited so a repeating error (e.g. an error loop) can't spam the
    // banner into flashing on every tick.
    const now = Date.now();
    if (now - this.lastShownAt < this.MIN_INTERVAL_MS) return;
    this.lastShownAt = now;
    this.notice.set(notice);
  }

  dismiss(): void {
    this.notice.set(null);
  }
}
