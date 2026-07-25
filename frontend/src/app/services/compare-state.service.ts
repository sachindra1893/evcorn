import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface CompareVehicle {
  id: string; // The car's ID
}

@Injectable({
  providedIn: 'root'
})
export class CompareStateService {
  private readonly STORAGE_KEY = 'evcorn_compare_tray';
  private maxCompareSlots = 4;
  
  private selectedVehiclesSubject = new BehaviorSubject<string[]>([]);
  public selectedVehicles$: Observable<string[]> = this.selectedVehiclesSubject.asObservable();

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
            // Keep up to maxCompareSlots
            this.selectedVehiclesSubject.next(parsed.slice(0, this.maxCompareSlots));
          }
        }
      } catch (e) {
        console.error('Error parsing compare state from localStorage', e);
      }
    }
  }

  private saveState(ids: string[]): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ids));
    }
  }

  get currentSelectedIds(): string[] {
    return this.selectedVehiclesSubject.getValue();
  }

  addVehicle(carId: string): boolean {
    const current = this.currentSelectedIds;
    if (current.includes(carId)) {
      return false; // Already added
    }
    
    if (current.length >= this.maxCompareSlots) {
      alert(`You can only compare up to ${this.maxCompareSlots} vehicles at once.`);
      return false;
    }
    
    const updated = [...current, carId];
    this.selectedVehiclesSubject.next(updated);
    this.saveState(updated);
    return true;
  }

  removeVehicle(carId: string): void {
    const current = this.currentSelectedIds;
    const updated = current.filter(id => id !== carId);
    this.selectedVehiclesSubject.next(updated);
    this.saveState(updated);
  }

  isSelected(carId: string): boolean {
    return this.currentSelectedIds.includes(carId);
  }

  clear(): void {
    this.selectedVehiclesSubject.next([]);
    this.saveState([]);
  }

  setVehicles(carIds: string[]): void {
    const clamped = carIds.slice(0, this.maxCompareSlots);
    this.selectedVehiclesSubject.next(clamped);
    this.saveState(clamped);
  }
}
