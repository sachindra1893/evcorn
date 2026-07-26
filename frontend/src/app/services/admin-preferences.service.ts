import { Injectable } from '@angular/core';

export interface AdminPreferences {
  pageSize: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  selectedCategory: string;
  selectedStatus: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminPreferencesService {
  private readonly storageKey = 'evcorn_admin_prefs';
  private readonly defaultPrefs: AdminPreferences = {
    pageSize: 10,
    sortField: 'createdAt',
    sortDirection: 'desc',
    selectedCategory: 'all',
    selectedStatus: 'all'
  };

  getPreferences(): AdminPreferences {
    if (typeof window === 'undefined') return this.defaultPrefs;
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? { ...this.defaultPrefs, ...JSON.parse(data) } : this.defaultPrefs;
    } catch (e) {
      return this.defaultPrefs;
    }
  }

  savePreferences(prefs: Partial<AdminPreferences>) {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getPreferences();
      const updated = { ...current, ...prefs };
      localStorage.setItem(this.storageKey, JSON.stringify(updated));
    } catch (e) {}
  }
}
