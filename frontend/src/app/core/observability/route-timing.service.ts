import { Injectable, inject } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  Event as RouterEvent
} from '@angular/router';
import { DiagnosticsService } from '../diagnostics/diagnostics.service';
import { SLOW_ROUTE_THRESHOLD_MS } from '../observability/observability.constants';

/**
 * Records Angular router navigation start→end timing (Phase 2).
 * Observability only — does not alter navigation or Phase 1 error recovery.
 */
@Injectable({ providedIn: 'root' })
export class RouteTimingService {
  private readonly router = inject(Router);
  private readonly diagnostics = inject(DiagnosticsService);

  private navStartedAt: number | null = null;
  private navId: number | null = null;
  private navUrl: string | null = null;

  constructor() {
    this.router.events.subscribe((event) => this.onRouterEvent(event));
  }

  private onRouterEvent(event: RouterEvent): void {
    if (event instanceof NavigationStart) {
      this.navStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.navId = event.id;
      this.navUrl = event.url;
      return;
    }

    if (
      event instanceof NavigationEnd ||
      event instanceof NavigationCancel ||
      event instanceof NavigationError
    ) {
      if (this.navId !== null && event.id !== this.navId) return;

      const durationMs =
        this.navStartedAt == null
          ? undefined
          : Math.round(
              (typeof performance !== 'undefined' ? performance.now() : Date.now()) -
                this.navStartedAt
            );
      const route = event instanceof NavigationEnd ? event.urlAfterRedirects : this.navUrl ?? undefined;

      if (event instanceof NavigationError) {
        // NavigationErrorHandler also reports; keep a timed diagnostic here.
        const inner = (event as NavigationError).error;
        this.diagnostics.routeFailure('Router navigation failed', {
          durationMs,
          route,
          what: 'Router navigation failed',
          where: route,
          why: inner instanceof Error ? inner.message : String(inner ?? 'unknown')
        });
      } else if (durationMs != null && durationMs >= SLOW_ROUTE_THRESHOLD_MS) {
        this.diagnostics.routeTiming(`Slow route navigation (${durationMs}ms)`, {
          durationMs,
          route,
          what: 'Route navigation exceeded slow threshold',
          where: route,
          why: `durationMs=${durationMs} >= ${SLOW_ROUTE_THRESHOLD_MS}`
        });
      } else if (durationMs != null) {
        this.diagnostics.routeTiming(`Route navigation completed (${durationMs}ms)`, {
          durationMs,
          route
        });
      }

      this.navStartedAt = null;
      this.navId = null;
      this.navUrl = null;
    }
  }
}
