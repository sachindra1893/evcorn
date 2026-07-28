import { Injectable, computed, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Single source of truth for offline detection and "backend is waking up"
 * status. Replaces BlogDataService.isRetrying$ (which only covered its own
 * 6 methods) - the centralized HTTP interceptor now reports into this
 * service for every request in the app.
 */
@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  private readonly onlineSignal = signal<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  /**
   * Reference-counted rather than a plain boolean: multiple requests can be
   * retrying concurrently (e.g. categories + vehicles both cold-starting at
   * once), and each must independently "release" the waking state so one
   * request finishing early doesn't hide the banner while others are still
   * retrying.
   */
  private readonly backendWakingCount = signal<number>(0);

  readonly online = this.onlineSignal.asReadonly();
  readonly backendWaking = computed(() => this.backendWakingCount() > 0);

  private readonly reconnected = new Subject<void>();
  /** Emits once whenever the browser transitions from offline -> online. */
  readonly onReconnected: Observable<void> = this.reconnected.asObservable();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.onlineSignal.set(false));
    }
  }

  isOnline(): boolean {
    return this.onlineSignal();
  }

  beginBackendWaking(): void {
    this.backendWakingCount.update((count) => count + 1);
  }

  endBackendWaking(): void {
    this.backendWakingCount.update((count) => Math.max(0, count - 1));
  }

  private handleOnline(): void {
    const wasOffline = !this.onlineSignal();
    this.onlineSignal.set(true);
    if (wasOffline) {
      this.reconnected.next();
    }
  }
}
