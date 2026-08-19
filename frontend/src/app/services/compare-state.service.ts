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
  private readonly CAR_STORAGE_KEY = 'evcorn_compare_tray';
  private readonly TW_STORAGE_KEY = 'evcorn_compare_tray_two_wheeler';
  private readonly maxCompareSlots = COMPARE_MAX_VEHICLES;

  private currentType: 'car' | 'two-wheeler' = 'car';
  private selectedVehiclesSubject = new BehaviorSubject<string[]>([]);
  public selectedVehicles$: Observable<string[]> = this.selectedVehiclesSubject.asObservable();

  /** Soft notice for UI (full tray / duplicate) — no window.alert. */
  private noticeSubject = new BehaviorSubject<string | null>(null);
  public notice$: Observable<string | null> = this.noticeSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.loadInitialState();
  }

  public setVehicleType(type: 'car' | 'two-wheeler'): void {
    if (this.currentType !== type) {
      this.currentType = type;
      this.loadInitialState();
    }
  }

  public getVehicleType(): 'car' | 'two-wheeler' {
    return this.currentType;
  }

  private getStorageKey(): string {
    return this.currentType === 'two-wheeler' ? this.TW_STORAGE_KEY : this.CAR_STORAGE_KEY;
  }

  private loadInitialState(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const stored = localStorage.getItem(this.getStorageKey());
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.selectedVehiclesSubject.next(clampCompareIds(parsed, this.maxCompareSlots));
            return;
          }
        }
      } catch {
        // Corrupt storage — start empty; do not break the site.
      }
    }
    this.selectedVehiclesSubject.next([]);
  }

  private saveState(ids: string[]): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.getStorageKey(), JSON.stringify(ids));
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

  addVehicle(vehicleId: string, type?: 'car' | 'two-wheeler'): boolean {
    if (type && type !== this.currentType) {
      this.setVehicleType(type);
    }
    const result = this.addVehicleDetailed(vehicleId);
    return result.ok;
  }

  addVehicleDetailed(vehicleId: string): CompareSelectionResult {
    const result = tryAddCompareId(this.currentSelectedIds, vehicleId, this.maxCompareSlots);
    if (!result.ok) {
      if (result.reason === 'full') {
        const itemLabel = this.currentType === 'two-wheeler' ? 'two-wheelers' : 'EVs';
        this.noticeSubject.next(`You can compare up to ${this.maxCompareSlots} ${itemLabel}. Remove one to add another.`);
      } else if (result.reason === 'duplicate') {
        this.noticeSubject.next('This vehicle is already in your comparison.');
      }
      return result;
    }
    this.noticeSubject.next(null);
    this.selectedVehiclesSubject.next(result.ids);
    this.saveState(result.ids);
    return result;
  }

  toggleVehicle(vehicleId: string, type?: 'car' | 'two-wheeler'): boolean {
    if (type && type !== this.currentType) {
      this.setVehicleType(type);
    }
    if (this.isSelected(vehicleId)) {
      this.removeVehicle(vehicleId);
      return false;
    }
    return this.addVehicle(vehicleId, type);
  }

  removeVehicle(vehicleId: string): void {
    const updated = this.currentSelectedIds.filter((id) => id !== vehicleId);
    this.selectedVehiclesSubject.next(updated);
    this.saveState(updated);
    this.noticeSubject.next(null);
  }

  isSelected(vehicleId: string): boolean {
    return this.currentSelectedIds.includes(vehicleId);
  }

  setVehicles(ids: string[]): void {
    const clamped = clampCompareIds(ids, this.maxCompareSlots);
    this.selectedVehiclesSubject.next(clamped);
    this.saveState(clamped);
  }

  clear(): void {
    this.selectedVehiclesSubject.next([]);
    this.saveState([]);
    this.noticeSubject.next(null);
  }
}
