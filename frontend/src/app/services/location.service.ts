import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { getApiBaseUrl } from '../core/http/api-base-url';

export interface LocationData {
  city: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
  timestamp: number;
  source: 'ip' | 'manual';
  displayName: string;
}

interface LocationState {
  global: LocationData | null;
  overrides: Record<string, LocationData>;
  isDetecting: boolean;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private readonly GLOBAL_STORAGE_KEY = 'evcorn_smart_location_v2';
  private readonly RECENT_STORAGE_KEY = 'evcorn_recent_locations';
  private readonly PERMISSION_STORAGE_KEY = 'evcorn_location_permission_status';
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours Session/Local Storage TTL

  private stateSubject = new BehaviorSubject<LocationState>({
    global: null,
    overrides: {},
    isDetecting: true,
    permissionStatus: 'unknown'
  });

  constructor() {
    this.initSmartLocation();
  }

  /**
   * Main City Location Initialization Sequence:
   * 1. Check cached city location in localStorage. If valid & unexpired (<24h), emit immediately for instant startup.
   * 2. If no valid cache -> auto-detect city via server-side IP geolocation (with client-side IP fallback).
   * 3. GPS & reverse-geocoding are completely disabled to guarantee clean city-level names (no colony/society names).
   */
  private async initSmartLocation() {
    const localStore = this.getStorage('local');
    const sessionStore = this.getStorage('session');

    const initialState: LocationState = {
      global: null,
      overrides: {},
      isDetecting: true,
      permissionStatus: (localStore?.getItem(this.PERMISSION_STORAGE_KEY) as any) || 'unknown'
    };

    // Load session overrides
    if (sessionStore) {
      for (let i = 0; i < sessionStore.length; i++) {
        const key = sessionStore.key(i);
        if (key && key.startsWith('evcorn_override_')) {
          try {
            const moduleName = key.replace('evcorn_override_', '');
            initialState.overrides[moduleName] = JSON.parse(sessionStore.getItem(key)!);
          } catch (e) {
            console.error('Failed to parse override location', e);
          }
        }
      }
    }

    const cachedGlobal = this.getCachedGlobalLocation();
    const isCacheFresh = cachedGlobal && cachedGlobal.timestamp && (Date.now() - cachedGlobal.timestamp < this.CACHE_TTL_MS);

    if (cachedGlobal && isCacheFresh && cachedGlobal.displayName && cachedGlobal.displayName !== 'Select city') {
      initialState.global = cachedGlobal;
      initialState.isDetecting = false;
      this.stateSubject.next(initialState);
      return;
    }

    // No cache or expired cache -> Auto-detect location via IP
    this.stateSubject.next(initialState);
    await this.autoDetectLocation('global', true);
  }

  private getStorage(type: 'local' | 'session'): Storage | null {
    if (typeof window === 'undefined') return null;
    try {
      return type === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  }

  private getCachedGlobalLocation(): LocationData | null {
    const store = this.getStorage('local');
    if (!store) return null;
    const saved = store.getItem(this.GLOBAL_STORAGE_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }

  public isDetecting$(): Observable<boolean> {
    return this.stateSubject.asObservable().pipe(map(s => s.isDetecting));
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
    const sanitizedCity = this.sanitizeEnglishCityName(loc.city);
    const sanitizedDisplay = this.sanitizeEnglishCityName(loc.displayName || loc.city);

    const sanitizedLoc: LocationData = {
      ...loc,
      city: sanitizedCity,
      displayName: sanitizedDisplay
    };

    const currentState = this.stateSubject.value;
    const newState = {
      ...currentState,
      isDetecting: false,
      overrides: { ...currentState.overrides }
    };

    const localStore = this.getStorage('local');
    const sessionStore = this.getStorage('session');

    if (setAsGlobal || moduleContext === 'global') {
      if (localStore) localStore.setItem(this.GLOBAL_STORAGE_KEY, JSON.stringify(sanitizedLoc));
      newState.global = sanitizedLoc;
      if (moduleContext !== 'global') {
        if (sessionStore) sessionStore.removeItem(`evcorn_override_${moduleContext}`);
        delete newState.overrides[moduleContext];
      }
    } else {
      if (sessionStore) sessionStore.setItem(`evcorn_override_${moduleContext}`, JSON.stringify(sanitizedLoc));
      newState.overrides[moduleContext] = sanitizedLoc;
    }

    if (sanitizedDisplay !== 'Select city') {
      this.addRecentLocation(sanitizedLoc);
    }
    this.stateSubject.next(newState);
  }

  /**
   * Automatic Location Resolution (Server-Side IP Geolocation -> Client-Side IP Fallback)
   * NO GPS / browser geolocation API is used.
   */
  public async autoDetectLocation(moduleContext: string = 'global', setAsGlobal: boolean = true): Promise<boolean> {
    this.setDetectingState(true);

    // Step 1: Try Server-Side IP Geolocation endpoint
    try {
      const res = await this.fetchWithTimeout(`${getApiBaseUrl()}/location/detect`, { timeout: 4500 });
      if (res.ok) {
        const data = await res.json();
        if (data && data.city && data.city !== 'Select city') {
          const city = this.sanitizeEnglishCityName(data.city);
          const loc: LocationData = {
            city: city,
            state: this.sanitizeEnglishCityName(data.state || ''),
            country: data.country || 'India',
            lat: 20.5937,
            lon: 78.9629,
            timestamp: Date.now(),
            source: 'ip',
            displayName: city
          };
          this.setLocation(loc, moduleContext, setAsGlobal);
          return true;
        }
      }
    } catch (e) {}

    // Step 2: Client-side IP Geolocation Fallback
    const ipSuccess = await this.tryClientIpLocation(moduleContext, setAsGlobal);
    if (ipSuccess) {
      return true;
    }

    // Step 3: Default Fallback State ("Select city" placeholder)
    const defaultLocation: LocationData = {
      city: 'Select city',
      state: '',
      country: 'India',
      lat: 20.5937,
      lon: 78.9629,
      timestamp: Date.now(),
      source: 'manual',
      displayName: 'Select city'
    };
    this.setLocation(defaultLocation, moduleContext, setAsGlobal);
    return false;
  }

  public async requestGeolocation(moduleContext: string, setAsGlobal: boolean = false): Promise<boolean> {
    return this.autoDetectLocation(moduleContext, setAsGlobal);
  }

  private setDetectingState(isDetecting: boolean) {
    const cur = this.stateSubject.value;
    this.stateSubject.next({ ...cur, isDetecting });
  }

  private async tryClientIpLocation(moduleContext: string, setAsGlobal: boolean): Promise<boolean> {
    // Provider 1: freeipapi.com
    try {
      const res = await this.fetchWithTimeout('https://freeipapi.com/api/json', { timeout: 3500 });
      if (res.ok) {
        const data = await res.json();
        if (data && data.cityName) {
          const city = this.sanitizeEnglishCityName(data.cityName);
          if (city && city !== 'Select city') {
            const loc: LocationData = {
              city: city,
              state: this.sanitizeEnglishCityName(data.regionName || ''),
              country: data.countryName || 'India',
              lat: data.latitude || 20.5937,
              lon: data.longitude || 78.9629,
              timestamp: Date.now(),
              source: 'ip',
              displayName: city
            };
            this.setLocation(loc, moduleContext, setAsGlobal);
            return true;
          }
        }
      }
    } catch (e) {}

    // Provider 2: ipapi.co
    try {
      const res = await this.fetchWithTimeout('https://ipapi.co/json/', { timeout: 3500 });
      if (res.ok) {
        const data = await res.json();
        if (data && data.city) {
          const city = this.sanitizeEnglishCityName(data.city);
          if (city && city !== 'Select city') {
            const loc: LocationData = {
              city: city,
              state: this.sanitizeEnglishCityName(data.region || ''),
              country: data.country_name || 'India',
              lat: data.latitude || 20.5937,
              lon: data.longitude || 78.9629,
              timestamp: Date.now(),
              source: 'ip',
              displayName: city
            };
            this.setLocation(loc, moduleContext, setAsGlobal);
            return true;
          }
        }
      }
    } catch (e) {}

    return false;
  }

  /**
   * Generic English-Only City Name Sanitizer
   * Returns strictly a clean city name — no colony, neighborhood, street, or society names.
   */
  public sanitizeEnglishCityName(input: string | undefined | null): string {
    if (!input) return 'Select city';
    let str = String(input).trim();

    if (str === 'Select city' || str === 'Detecting location...') return str;

    // Strip Devanagari character ranges [\u0900-\u097F]
    str = str.replace(/[\u0900-\u097F]+/g, '').trim();

    // Normalize Latin accents
    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Strip non-alphanumeric except spaces and hyphens
    str = str.replace(/[^a-zA-Z0-9\s-]/g, '').trim();

    // Specific city alias normalizations
    if (/^noida/i.test(str) || /greater noida/i.test(str)) return 'Noida';
    if (/new delhi/i.test(str)) return 'Delhi';
    if (/gurgaon/i.test(str)) return 'Gurugram';
    if (/bangalore/i.test(str)) return 'Bengaluru';

    if (!str || str.length < 2) return 'Select city';
    return str;
  }

  private async fetchWithTimeout(resource: string, options: RequestInit & { timeout?: number } = {}): Promise<Response> {
    const { timeout = 4000, ...fetchOptions } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(resource, {
        ...fetchOptions,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  public getRecentLocations(): LocationData[] {
    const store = this.getStorage('local');
    if (!store) return [];
    const saved = store.getItem(this.RECENT_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [];
  }

  private addRecentLocation(loc: LocationData) {
    let recents = this.getRecentLocations();
    recents = recents.filter(r => r.city.toLowerCase() !== loc.city.toLowerCase());
    recents.unshift(loc);
    if (recents.length > 5) recents = recents.slice(0, 5);
    const store = this.getStorage('local');
    if (store) store.setItem(this.RECENT_STORAGE_KEY, JSON.stringify(recents));
  }

  public async searchLocations(query: string): Promise<LocationData[]> {
    if (!query || query.trim().length < 2) return [];
    
    try {
      const res = await this.fetchWithTimeout(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en`,
        { timeout: 4000 }
      );
      if (res.ok) {
        const data = await res.json();
        return data.features.map((f: any) => {
          const props = f.properties;
          const rawCity = props.city || props.name || props.town || props.village || props.county || 'Select city';
          const city = this.sanitizeEnglishCityName(rawCity);
          const state = this.sanitizeEnglishCityName(props.state || '');
          const country = props.country || '';
          
          let displayName = city;
          if (state && state !== city && city !== 'Select city') displayName += `, ${state}`;
          
          return {
            city,
            state,
            country,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            timestamp: Date.now(),
            source: 'manual' as const,
            displayName
          };
        });
      }
    } catch (e) {
      console.error('Search API failed', e);
    }
    return [];
  }
}
