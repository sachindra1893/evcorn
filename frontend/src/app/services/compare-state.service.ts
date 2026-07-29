import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import {
  COMPARE_MAX_VEHICLES,
  CompareSelectionResult,
  clampCompareIds,
  tryAddCompareId
} from '../compare/compare-engine';

export interface CompareVehicle {
  id: string;
}

/**
 * Compare selection state — localStorage + shareable URL consumers.
 * MVP max = 2 (COMPARE_MAX_VEHICLES). Isolated from Browse/Detail data loads.
 */
@Injectable({
  providedIn: 'root'
})
export class CompareStateService {
  private readonly STORAGE_KEY = 'evcorn_compare_tray';
  private readonly maxCompareSlots = COMPARE_MAX_VEHICLES;

  private selectedVehiclesSubject = new BehaviorSubject<string[]>([]);
  public selectedVehicles$: Observable<string[]> = this.selectedVehiclesSubject.asObservable();

  /** Soft notice for UI (full tray / duplicate) — no window.alert. */
  private noticeSubject = new BehaviorSubject<string | null>(null);
  public notice$: Observable<string | null> = this.noticeSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.loadInitialState();
  }

  private loadInitialState(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.selectedVehiclesSubject.next(clampCompareIds(parsed, this.maxCompareSlots));
          }
        }
      } catch {
        // Corrupt storage — start empty; do not break the site.
      }
    }
  }

  private saveState(ids: string[]): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ids));
      } catch {
        // Quota / private mode — selection still works in-memory.
      }
    }
  }

  get currentSelectedIds(): string[] {
    return this.selectedVehiclesSubject.getValue();
  }

  get maxSlots(): number {
    return this.maxCompareSlots;
  }

  clearNotice(): void {
    this.noticeSubject.next(null);
  }

  addVehicle(carId: string): boolean {
    const result = this.addVehicleDetailed(carId);
    return result.ok;
  }

  addVehicleDetailed(carId: string): CompareSelectionResult {
    const result = tryAddCompareId(this.currentSelectedIds, carId, this.maxCompareSlots);
    if (!result.ok) {
      if (result.reason === 'full') {
        this.noticeSubject.next(`You can compare up to ${this.maxCompareSlots} EVs. Remove one to add another.`);
      } else if (result.reason === 'duplicate') {
        this.noticeSubject.next('This EV is already in your comparison.');
      }
      return result;
    }
    this.noticeSubject.next(null);
    this.selectedVehiclesSubject.next(result.ids);
    this.saveState(result.ids);
    return result;
  }

  toggleVehicle(carId: string): boolean {
    if (this.isSelected(carId)) {
      this.removeVehicle(carId);
      return false;
    }
    return this.addVehicle(carId);
  }

  removeVehicle(carId: string): void {
    const updated = this.currentSelectedIds.filter((id) => id !== carId);
    this.selectedVehiclesSubject.next(updated);
    this.saveState(updated);
    this.noticeSubject.next(null);
  }

  isSelected(carId: string): boolean {
    return this.currentSelectedIds.includes(carId);
  }

  clear(): void {
    this.selectedVehiclesSubject.next([]);
    this.saveState([]);
    this.noticeSubject.next(null);
  }

  setVehicles(carIds: string[]): void {
    const clamped = clampCompareIds(carIds, this.maxCompareSlots);
    this.selectedVehiclesSubject.next(clamped);
    this.saveState(clamped);
  }
}
