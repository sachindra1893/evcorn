import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { filter } from 'rxjs/operators';

export interface AnalyticsEventPayload {
  eventName: string;
  pageUrl: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  referrer?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly apiUrl = '/api/analytics/event';

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(DOCUMENT) private dom: Document
  ) {
    // Automatically track Page Views on route changes
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.trackPageView(event.urlAfterRedirects);
    });
  }

  /**
   * Central Privacy-Conscious Event Dispatcher
   */
  trackEvent(eventName: string, metadata: Record<string, any> = {}) {
    const payload: AnalyticsEventPayload = {
      eventName,
      pageUrl: `${this.dom.location.pathname}${this.dom.location.search}`,
      deviceType: this.detectDeviceType(),
      referrer: this.dom.referrer || undefined,
      metadata,
      timestamp: new Date().toISOString()
    };

    // Dispatch event to backend analytics pipeline asynchronously
    this.http.post(this.apiUrl, payload).subscribe({
      error: () => {} // Silent fail to never impact user experience
    });
  }

  trackPageView(pageUrl?: string) {
    this.trackEvent('page_view', { url: pageUrl || this.dom.location.pathname });
  }

  trackArticleView(articleId: string, title: string, categoryId: string) {
    this.trackEvent('article_view', { articleId, title, categoryId });
  }

  trackVehicleView(vehicleId: string, name: string, brand: string) {
    this.trackEvent('vehicle_view', { vehicleId, name, brand });
  }

  trackVehicleCompare(vehicleIds: string[]) {
    this.trackEvent('vehicle_compare', { vehicleIds, count: vehicleIds.length });
  }

  trackSearch(searchTerm: string, resultCount: number) {
    this.trackEvent('search', { searchTerm, resultCount, zeroResult: resultCount === 0 });
  }

  trackCalculatorUsage(calculatorType: string, inputs: Record<string, any>) {
    this.trackEvent('calculator_usage', { calculatorType, inputs });
  }

  track404(attemptedUrl: string) {
    this.trackEvent('error_404', { attemptedUrl });
  }

  private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }
}
