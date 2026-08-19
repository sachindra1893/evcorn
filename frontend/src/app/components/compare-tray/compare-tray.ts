import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CompareStateService } from '../../services/compare-state.service';
import { BlogDataService } from '../../services/blog-data.service';
import { COMPARE_MAX_VEHICLES, buildCompareQueryString } from '../../compare/compare-engine';

/**
 * Floating compare tray — MVP max 2.
 * Mounted on Browse pages. Isolated: failures must not affect Browse.
 */
@Component({
  selector: 'app-compare-tray',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (selectedIds.length > 0) {
      <div class="compare-tray-wrapper animate-slide-up" role="region" aria-label="Compare selection">
        <div class="compare-tray-content">
          <div class="tray-header">
            <span class="tray-title">Compare ({{ selectedIds.length }}/{{ maxSlots }})</span>
            <button type="button" class="clear-btn" (click)="clearAll()">Clear</button>
          </div>

          <div class="tray-slots">
            @for (id of selectedIds; track id) {
              <div class="tray-slot filled">
                <span class="slot-name">{{ getVehicleName(id) }}</span>
                <button type="button" class="remove-btn" (click)="removeVehicle(id)" title="Remove" aria-label="Remove from compare">✕</button>
              </div>
            }
            @if (selectedIds.length < maxSlots) {
              <div class="tray-slot empty">
                <span class="slot-placeholder">{{ vehicleType === 'two-wheeler' ? '+ Add another 2W' : '+ Add another EV' }}</span>
              </div>
            }
          </div>

          <button
            type="button"
            class="compare-now-btn"
            [class.needs-more]="!canCompare"
            [disabled]="!canCompare"
            [attr.aria-disabled]="!canCompare"
            (click)="goToCompare()">
            {{ canCompare ? ('Compare (' + selectedIds.length + ')') : (vehicleType === 'two-wheeler' ? 'Select one more two-wheeler to compare.' : 'Select one more EV to compare.') }}
          </button>
        </div>

        @if (notice) {
          <p class="tray-notice" role="status">{{ notice }}</p>
        }
      </div>
    }
  `,
  styles: [`
    .compare-tray-wrapper {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      width: 90%;
      max-width: 640px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08), 0 4px 10px rgba(0,0,0,0.03);
      padding: 12px 16px;
    }

    .animate-slide-up {
      animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUp {
      from { transform: translate(-50%, 150%); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }

    .compare-tray-content {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    @media (min-width: 768px) {
      .compare-tray-content {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .tray-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    @media (min-width: 768px) {
      .tray-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }

    .tray-title {
      font-weight: 800;
      color: #0F172A;
      font-size: 0.95rem;
    }

    .clear-btn {
      background: none;
      border: none;
      color: #64748B;
      font-size: 0.8rem;
      cursor: pointer;
      padding: 0;
      font-weight: 600;
    }
    .clear-btn:hover { color: #EF4444; }

    .tray-slots {
      display: flex;
      gap: 8px;
      flex: 1;
      justify-content: center;
      flex-wrap: wrap;
    }

    .tray-slot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 0.85rem;
      min-width: 110px;
      max-width: 180px;
      flex: 1;
    }

    .tray-slot.filled {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #0F172A;
      font-weight: 700;
    }

    .tray-slot.empty {
      background: rgba(2, 132, 199, 0.03);
      border: 1px dashed rgba(2, 132, 199, 0.2);
      color: #94A3B8;
      justify-content: center;
    }

    .slot-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .remove-btn {
      background: none;
      border: none;
      color: #94A3B8;
      cursor: pointer;
      font-size: 0.8rem;
      padding: 2px;
      margin-left: 8px;
    }
    .remove-btn:hover { color: #EF4444; }

    .compare-now-btn {
      background: #0284C7;
      color: white;
      border: none;
      padding: 10px 18px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.2);
      transition: all 0.2s;
      white-space: nowrap;
    }
    .compare-now-btn:hover:not(:disabled) {
      background: #0369A1;
      transform: translateY(-1px);
    }
    .compare-now-btn:disabled,
    .compare-now-btn.needs-more {
      opacity: 0.9;
      cursor: default;
      box-shadow: none;
      background: #E2E8F0;
      color: #475569;
    }

    .tray-notice {
      margin: 8px 0 0;
      font-size: 0.78rem;
      color: #B45309;
      text-align: center;
    }

    @media (max-width: 767px) {
      .compare-tray-wrapper {
        bottom: 80px;
      }
      .tray-slots {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      .tray-slot { min-width: 0; }
      .compare-now-btn { width: 100%; }
    }
  `]
})
export class CompareTrayComponent implements OnInit, OnDestroy {
  @Input() vehicleType: 'car' | 'two-wheeler' = 'car';
  selectedIds: string[] = [];
  notice: string | null = null;
  readonly maxSlots = COMPARE_MAX_VEHICLES;

  private nameCache = new Map<string, string>();
  private subs: Subscription[] = [];

  constructor(
    private compareState: CompareStateService,
    private blogData: BlogDataService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get canCompare(): boolean {
    return this.selectedIds.length >= 2;
  }

  ngOnInit(): void {
    this.subs.push(
      this.compareState.selectedVehicles$.subscribe((ids) => {
        this.selectedIds = ids;
        this.prefetchNames(ids);
        this.cdr.detectChanges();
      })
    );

    this.subs.push(
      this.compareState.notice$.subscribe((msg) => {
        this.notice = msg;
        this.cdr.detectChanges();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  getVehicleName(id: string): string {
    return this.nameCache.get(id) || (this.vehicleType === 'two-wheeler' ? 'Two-Wheeler' : 'EV');
  }

  removeVehicle(id: string): void {
    this.compareState.removeVehicle(id);
  }

  clearAll(): void {
    this.compareState.clear();
  }

  goToCompare(): void {
    if (!this.canCompare) return;
    const qs = buildCompareQueryString(this.selectedIds);
    if (this.vehicleType === 'two-wheeler') {
      const full = qs ? `${qs}&type=two-wheeler` : 'type=two-wheeler';
      this.router.navigateByUrl(`/compare?${full}`);
    } else {
      this.router.navigateByUrl(qs ? `/compare?${qs}` : '/compare');
    }
  }

  private prefetchNames(ids: string[]): void {
    const missing = ids.filter((id) => !this.nameCache.has(id));
    if (missing.length === 0) return;

    // Reuse Browse light cache — avoid a second full-catalog request.
    this.blogData.getVehiclesLight().subscribe({
      next: (vehicles) => {
        for (const v of vehicles) {
          if (v.id) {
            this.nameCache.set(v.id, v.parentModel || v.name);
          }
        }
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges()
    });
  }
}
