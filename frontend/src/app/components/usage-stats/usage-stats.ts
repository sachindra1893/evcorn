import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { getApiBaseUrl } from '../../core/http/api-base-url';

export interface StatsSummary {
  comparisons: number;
  calculatorUses: number;
  vehiclesViewed: number;
}

@Component({
  selector: 'app-usage-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="usage-stats-wrapper animate-premium-fade">
      <div class="stats-card">
        <div class="stats-grid">
          
          <!-- Stat Item 1: Comparisons -->
          <div class="stat-item">
            <div class="stat-icon-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 3h5v5"></path>
                <path d="M4 20L21 3"></path>
                <path d="M21 16v5h-5"></path>
                <path d="M15 15l6 6"></path>
                <path d="M4 4l5 5"></path>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-primary">
                @if (stats.comparisons >= MIN_THRESHOLD) {
                  {{ stats.comparisons | number }}
                } @else {
                  Active
                }
              </span>
              <span class="stat-label">
                @if (stats.comparisons >= MIN_THRESHOLD) {
                  vehicles compared this month
                } @else {
                  New comparisons happening daily
                }
              </span>
            </div>
          </div>

          <div class="stat-divider"></div>

          <!-- Stat Item 2: Calculator Uses -->
          <div class="stat-item">
            <div class="stat-icon-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2"></rect>
                <line x1="8" y1="6" x2="16" y2="6"></line>
                <line x1="16" y1="14" x2="16" y2="18"></line>
                <path d="M16 10h.01"></path>
                <path d="M12 10h.01"></path>
                <path d="M8 10h.01"></path>
                <path d="M12 14h.01"></path>
                <path d="M8 14h.01"></path>
                <path d="M12 18h.01"></path>
                <path d="M8 18h.01"></path>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-primary">
                @if (stats.calculatorUses >= MIN_THRESHOLD) {
                  {{ stats.calculatorUses | number }}
                } @else {
                  Popular
                }
              </span>
              <span class="stat-label">
                @if (stats.calculatorUses >= MIN_THRESHOLD) {
                  EV savings calculations run
                } @else {
                  EV savings calculator tool
                }
              </span>
            </div>
          </div>

          <div class="stat-divider"></div>

          <!-- Stat Item 3: Vehicle Specs Viewed -->
          <div class="stat-item">
            <div class="stat-icon-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-primary">
                @if (stats.vehiclesViewed >= MIN_THRESHOLD) {
                  {{ stats.vehiclesViewed | number }}
                } @else {
                  Trending
                }
              </span>
              <span class="stat-label">
                @if (stats.vehiclesViewed >= MIN_THRESHOLD) {
                  vehicle specs viewed
                } @else {
                  EV specs & buying guides
                }
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  `,
  styles: [`
    .usage-stats-wrapper {
      max-width: 1100px;
      margin: -2.5rem auto 2.5rem auto;
      padding: 0 1.5rem;
      position: relative;
      z-index: 10;
    }

    .stats-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.25rem 2rem;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .stats-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 36px -10px rgba(0, 0, 0, 0.08);
    }

    .stats-grid {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
    }

    .stat-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-primary {
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 0.85rem;
      color: #64748b;
      font-weight: 500;
    }

    .stat-divider {
      width: 1px;
      height: 40px;
      background: #e2e8f0;
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .usage-stats-wrapper {
        margin: 1.5rem auto;
      }
      .stats-grid {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }
      .stat-divider {
        display: none;
      }
      .stat-item {
        padding: 0.5rem 0;
        border-bottom: 1px solid #f1f5f9;
      }
      .stat-item:last-child {
        border-bottom: none;
      }
    }
  `]
})
export class UsageStatsComponent implements OnInit {
  /** Qualitative vs Quantitative display threshold (e.g. 25+) */
  readonly MIN_THRESHOLD = 25;

  stats: StatsSummary = {
    comparisons: 0,
    calculatorUses: 0,
    vehiclesViewed: 0
  };

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.fetchStats();
  }

  fetchStats() {
    this.http.get<{ success: boolean; data: StatsSummary }>(`${getApiBaseUrl()}/stats/summary`).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.stats = res.data;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        // Safe default fallback if network fails
      }
    });
  }
}
