import { Injectable } from '@angular/core';

export interface RecentItem {
  id: string;
  type: 'vehicle' | 'article';
  title: string;
  url: string;
  imageUrl?: string;
  viewedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecentHistoryService {
  private readonly storageKey = 'evcorn_recent_history';
  private readonly maxItems = 10;

  getRecentHistory(): RecentItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  addRecentItem(item: Omit<RecentItem, 'viewedAt'>) {
    if (typeof window === 'undefined') return;
    try {
      let history = this.getRecentHistory();
      // Deduplicate by ID
      history = history.filter(h => h.id !== item.id);
      
      history.unshift({
        ...item,
        viewedAt: new Date().toISOString()
      });

      if (history.length > this.maxItems) {
        history = history.slice(0, this.maxItems);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(history));
    } catch (e) {}
  }

  clearHistory() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {}
  }
}
