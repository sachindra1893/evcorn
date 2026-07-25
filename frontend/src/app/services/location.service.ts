import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface LocationData {
  city: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
  timestamp: number;
  displayName: string;
}

interface LocationState {
  global: LocationData | null;
  overrides: Record<string, LocationData>;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private readonly GLOBAL_STORAGE_KEY = 'evcorn_global_location';
  private readonly RECENT_STORAGE_KEY = 'evcorn_recent_locations';
  
  private stateSubject = new BehaviorSubject<LocationState>({
    global: null,
    overrides: {}
  });

  constructor() {
    this.hydrateState();
  }

  private hydrateState() {
    const initialState: LocationState = { global: null, overrides: {} };
    
    // Load Global
    const savedGlobal = localStorage.getItem(this.GLOBAL_STORAGE_KEY);
    if (savedGlobal) {
      try {
        initialState.global = JSON.parse(savedGlobal);
      } catch (e) {
        console.error('Failed to parse global location', e);
      }
    }

    // Load Overrides from sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('evcorn_override_')) {
        try {
          const moduleName = key.replace('evcorn_override_', '');
          initialState.overrides[moduleName] = JSON.parse(sessionStorage.getItem(key)!);
        } catch (e) {
          console.error('Failed to parse override location', e);
        }
      }
    }

    this.stateSubject.next(initialState);
  }

  public getLocationForModule(moduleContext: string): Observable<LocationData | null> {
    return this.stateSubject.asObservable().pipe(
      map(state => {
        if (moduleContext === 'global') {
          return state.global;
        }
        return state.overrides[moduleContext] || state.global || null;
      })
    );
  }

  public setLocation(loc: LocationData, moduleContext: string, setAsGlobal: boolean = false) {
    const currentState = this.stateSubject.value;
    const newState = { ...currentState, overrides: { ...currentState.overrides } };

    if (setAsGlobal || moduleContext === 'global') {
      localStorage.setItem(this.GLOBAL_STORAGE_KEY, JSON.stringify(loc));
      newState.global = loc;
      // If setting as global, clear any local override so it seamlessly falls back to global
      if (moduleContext !== 'global') {
        sessionStorage.removeItem(`evcorn_override_${moduleContext}`);
        delete newState.overrides[moduleContext];
      }
    } else {
      sessionStorage.setItem(`evcorn_override_${moduleContext}`, JSON.stringify(loc));
      newState.overrides[moduleContext] = loc;
    }

    this.addRecentLocation(loc);
    this.stateSubject.next(newState);
  }

  public getRecentLocations(): LocationData[] {
    const saved = localStorage.getItem(this.RECENT_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  }

  private addRecentLocation(loc: LocationData) {
    let recents = this.getRecentLocations();
    recents = recents.filter(r => r.city !== loc.city); // Remove duplicate
    recents.unshift(loc); // Add to front
    if (recents.length > 5) recents = recents.slice(0, 5); // Keep max 5
    localStorage.setItem(this.RECENT_STORAGE_KEY, JSON.stringify(recents));
  }

  public async requestGeolocation(moduleContext: string, setAsGlobal: boolean = false): Promise<boolean> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = await this.reverseGeocode(position.coords.latitude, position.coords.longitude);
          if (loc) {
            this.setLocation(loc, moduleContext, setAsGlobal);
            resolve(true);
          } else {
            resolve(false);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  private async fetchWithTimeout(resource: string, options: RequestInit & { timeout?: number } = {}): Promise<Response> {
    const { timeout = 5000, ...fetchOptions } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  }

  private async reverseGeocode(lat: number, lon: number): Promise<LocationData | null> {
    try {
      // Primary: Nominatim (with strict 5s timeout)
      const res = await this.fetchWithTimeout(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
        { headers: { 'User-Agent': 'EVCorn-Energy-App/1.0' }, timeout: 5000 }
      );
      if (res.ok) {
        const data = await res.json();
        const address = data.address;
        if (address) {
          const city = address.city || address.town || address.village || address.state_district || 'Unknown City';
          return {
            city: city,
            state: address.state || 'Unknown State',
            country: address.country || 'Unknown Country',
            lat: lat,
            lon: lon,
            timestamp: Date.now(),
            displayName: city
          };
        }
      }
    } catch (e) {
      console.warn('Nominatim failed or timed out, falling back to BigDataCloud', e);
    }

    try {
      // Fallback: BigDataCloud (with strict 5s timeout)
      const res = await this.fetchWithTimeout(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
        { timeout: 5000 }
      );
      if (res.ok) {
        const data = await res.json();
        const city = data.city || data.locality || 'Unknown City';
        return {
          city: city,
          state: data.principalSubdivision || 'Unknown State',
          country: data.countryName || 'Unknown Country',
          lat: lat,
          lon: lon,
          timestamp: Date.now(),
          displayName: city
        };
      }
    } catch (e) {
      console.error('All reverse geocoding failed', e);
    }
    
    return null;
  }

  public async searchLocations(query: string): Promise<LocationData[]> {
    if (!query || query.trim().length < 2) return [];
    
    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        return data.features.map((f: any) => {
          const props = f.properties;
          const city = props.city || props.name || props.town || props.village || props.county || 'Unknown';
          const state = props.state || '';
          const country = props.country || '';
          
          let displayName = city;
          if (state && state !== city) displayName += `, ${state}`;
          
          return {
            city: city,
            state: state,
            country: country,
            lat: f.geometry.coordinates[1], // GeoJSON is [lon, lat]
            lon: f.geometry.coordinates[0],
            timestamp: Date.now(),
            displayName: displayName
          };
        });
      }
    } catch (e) {
      console.error('Search API failed', e);
    }
    return [];
  }
}
