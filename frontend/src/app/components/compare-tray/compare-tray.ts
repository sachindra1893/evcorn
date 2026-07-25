import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { CompareStateService } from '../../services/compare-state.service';
import { CarSpec } from '../../services/blog-data.service';

@Component({
  selector: 'app-compare-tray',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (selectedIds.length > 0) {
      <div class="compare-tray-wrapper animate-slide-up">
        <div class="compare-tray-content">
          <div class="tray-header">
            <span class="tray-title">{{ headerText }}</span>
            <button class="clear-btn" (click)="clearAll()">Clear All</button>
          </div>
          
          <div class="tray-slots">
            @for (id of selectedIds; track id) {
              <div class="tray-slot filled">
                <span class="slot-name">{{ getVehicleName(id) }}</span>
                <button class="remove-btn" (click)="removeVehicle(id)" title="Remove">✕</button>
              </div>
            }
            
            @for (empty of emptySlots; track $index) {
              <div class="tray-slot empty">
                <span class="slot-placeholder">+ Add another EV</span>
              </div>
            }
          </div>
          
          <button class="compare-now-btn" [disabled]="selectedIds.length < 2 || isLoading" (click)="goToCompare()">
            @if (isLoading) {
              <span class="btn-spinner"></span> Loading...
            } @else {
              Compare Now
            }
          </button>
        </div>
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
      max-width: 800px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08), 0 4px 10px rgba(0,0,0,0.03);
      padding: 12px 20px;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    .animate-slide-up {
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    @keyframes slideUp {
      from { transform: translate(-50%, 150%); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }

    .compare-tray-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
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
    .clear-btn:hover {
      color: #EF4444;
    }

    .tray-slots {
      display: flex;
      gap: 10px;
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
      min-width: 120px;
      max-width: 160px;
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
    .remove-btn:hover {
      color: #EF4444;
    }

    .compare-now-btn {
      background: #0284C7;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.2);
      transition: all 0.2s;
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .compare-now-btn:hover:not(:disabled) {
      background: #0369A1;
      transform: translateY(-1px);
    }
    .compare-now-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      box-shadow: none;
    }
    
    .btn-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 8px;
    }
    
    @media (max-width: 767px) {
      .compare-tray-wrapper {
        bottom: 80px; /* Above mobile bottom nav */
      }
      .tray-slots {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      .tray-slot {
        min-width: 0;
      }
      .compare-now-btn {
        width: 100%;
      }
    }
  `]
})
export class CompareTrayComponent implements OnInit, OnDestroy {
  selectedIds: string[] = [];
  emptySlots: number[] = [1];
  isLoading = false;
  
  // Cache of fetched vehicles to look up names
  private vehiclesCache: Map<string, CarSpec> = new Map();
  private sub?: Subscription;

  constructor(
    private compareState: CompareStateService,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get headerText(): string {
    if (this.selectedIds.length === 0) return 'Compare (0/2)';
    if (this.selectedIds.length === 1) return 'Compare (1/2)';
    if (this.selectedIds.length === 2) return 'Compare (2/2)';
    const max = Math.max(4, this.selectedIds.length);
    return `Compare (${this.selectedIds.length}/${max})`;
  }

  ngOnInit() {
    this.sub = this.compareState.selectedVehicles$.subscribe(ids => {
      this.selectedIds = ids;
      this.emptySlots = ids.length < 2 ? [1] : [];
      
      const idsToFetch = ids.filter(id => !this.vehiclesCache.has(id));
      if (idsToFetch.length > 0) {
        this.isLoading = true;
        this.cdr.detectChanges();
        
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://evcorn.com';
        this.http.get<any[]>(`${baseUrl}/data/vehicles-index.json`).subscribe({
          next: (vehicles) => {
            idsToFetch.forEach(id => {
              const found = vehicles.find(v => v.id === id);
              if (found) this.vehiclesCache.set(id, found as CarSpec);
            });
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Compare tray failed to load vehicle index', err);
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  getVehicleName(id: string): string {
    const v = this.vehiclesCache.get(id);
    if (v) {
      return v.parentModel ? `${v.parentModel}` : v.name;
    }
    return 'Loading...';
  }

  removeVehicle(id: string) {
    this.compareState.removeVehicle(id);
  }

  clearAll() {
    this.compareState.clear();
  }

  goToCompare() {
    this.router.navigate(['/compare']);
  }
}
