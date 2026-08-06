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
  source: 'gps' | 'ip' | 'manual';
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
   * Main Smart Location Initialization Sequence:
   * 1. If cached location exists -> emit immediately for instant startup.
   * 2. If permission is granted -> silently check fresh GPS position on every load.
   * 3. If position changed >1 km -> update cache & UI immediately.
   * 4. If no cache -> trigger full auto-detection (GPS first -> IP fallback).
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
    if (cachedGlobal) {
      initialState.global = cachedGlobal;
      initialState.isDetecting = false;
      this.stateSubject.next(initialState);

      // Silent fresh GPS check on every load if permission is granted
      this.silentGpsCheckAndUpdate(cachedGlobal);
      return;
    }

    // No cache -> Auto-detect location
    this.stateSubject.next(initialState);
    await this.autoDetectLocation('global', true);
  }

  private async silentGpsCheckAndUpdate(cached: LocationData) {
    if (typeof window === 'undefined' || !navigator || !navigator.geolocation) return;

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state !== 'granted') return;
      } catch {}
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLat = position.coords.latitude;
        const newLon = position.coords.longitude;
        const distKm = this.calculateDistanceKm(cached.lat, cached.lon, newLat, newLon);

        // If user traveled >1 km from cached position, update immediately
        if (distKm > 1.0) {
          const freshLoc = await this.reverseGeocode(newLat, newLon, 'gps');
          if (freshLoc) {
            this.setLocation(freshLoc, 'global', true);
          }
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }

  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
    const sanitizedLoc = {
      ...loc,
      city: this.sanitizeEnglishCityName(loc.city),
      displayName: this.sanitizeEnglishCityName(loc.displayName || loc.city)
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

    this.addRecentLocation(sanitizedLoc);
    this.stateSubject.next(newState);
  }

  /**
   * Automatic Location Resolution (GPS First -> IP Fallback)
   */
  public async autoDetectLocation(moduleContext: string = 'global', setAsGlobal: boolean = true): Promise<boolean> {
    this.setDetectingState(true);

    // Step 1: Try GPS Browser Geolocation
    const gpsSuccess = await this.tryGpsLocation(moduleContext, setAsGlobal);
    if (gpsSuccess) {
      this.setPermissionStatus('granted');
      return true;
    }

    // Step 2: Fallback to IP-based Location if GPS fails/denied
    const ipSuccess = await this.tryIpLocation(moduleContext, setAsGlobal);
    if (ipSuccess) {
      return true;
    }

    // Step 3: Default Fallback if both fail
    const defaultLocation: LocationData = {
      city: 'India',
      state: '',
      country: 'India',
      lat: 20.5937,
      lon: 78.9629,
      timestamp: Date.now(),
      source: 'ip',
      displayName: 'India'
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

  private setPermissionStatus(status: 'granted' | 'denied' | 'prompt') {
    const store = this.getStorage('local');
    if (store) store.setItem(this.PERMISSION_STORAGE_KEY, status);
    const cur = this.stateSubject.value;
    this.stateSubject.next({ ...cur, permissionStatus: status });
  }

  private async tryGpsLocation(moduleContext: string, setAsGlobal: boolean): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator || !navigator.geolocation) {
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = await this.reverseGeocode(position.coords.latitude, position.coords.longitude, 'gps');
          if (loc) {
            this.setLocation(loc, moduleContext, setAsGlobal);
            resolve(true);
          } else {
            resolve(false);
          }
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            this.setPermissionStatus('denied');
          }
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: 0
        }
      );
    });
  }

  private async tryIpLocation(moduleContext: string, setAsGlobal: boolean): Promise<boolean> {
    try {
      // Primary IP Location API: BigDataCloud Client IP
      const res = await this.fetchWithTimeout(
        'https://api.bigdatacloud.net/data/client-ip',
        { timeout: 4000 }
      );
      if (res.ok) {
        const data = await res.json();
        const lat = data.latitude || data.location?.latitude;
        const lon = data.longitude || data.location?.longitude;
        if (lat && lon) {
          const loc = await this.reverseGeocode(lat, lon, 'ip');
          if (loc) {
            this.setLocation(loc, moduleContext, setAsGlobal);
            return true;
          }
        }
      }
    } catch {}

    try {
      // Secondary IP Location API: ipapi.co
      const res = await this.fetchWithTimeout(
        'https://ipapi.co/json/',
        { timeout: 4000 }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.city) {
          const city = this.sanitizeEnglishCityName(data.city);
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
    } catch {}

    return false;
  }

  private async reverseGeocode(lat: number, lon: number, source: 'gps' | 'ip'): Promise<LocationData | null> {
    // Attempt 1: BigDataCloud Reverse Geocoding with English locale
    try {
      const res = await this.fetchWithTimeout(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
        { timeout: 4000 }
      );
      if (res.ok) {
        const data = await res.json();
        const rawCity = data.city || data.locality || data.principalSubdivision || 'India';
        const city = this.sanitizeEnglishCityName(rawCity);
        const state = this.sanitizeEnglishCityName(data.principalSubdivision || '');
        const country = data.countryName || 'India';
        return {
          city,
          state,
          country,
          lat,
          lon,
          timestamp: Date.now(),
          source,
          displayName: city
        };
      }
    } catch {}

    // Attempt 2: Nominatim Reverse Geocoding with explicit English headers
    try {
      const res = await this.fetchWithTimeout(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=en`,
        { headers: { 'Accept-Language': 'en-US,en', 'User-Agent': 'EVCorn-App/2.0' }, timeout: 4000 }
      );
      if (res.ok) {
        const data = await res.json();
        const address = data.address || {};
        const rawCity = address.city || address.town || address.village || address.state_district || address.county || 'India';
        const city = this.sanitizeEnglishCityName(rawCity);
        const state = this.sanitizeEnglishCityName(address.state || '');
        const country = address.country || 'India';
        return {
          city,
          state,
          country,
          lat,
          lon,
          timestamp: Date.now(),
          source,
          displayName: city
        };
      }
    } catch {}

    return null;
  }

  /**
   * Generic English-Only Sanitizer
   * Relies on provider-native English locale query params.
   * Strips Devanagari/non-Latin scripts automatically for any city worldwide without a hardcoded dictionary.
   */
  public sanitizeEnglishCityName(input: string | undefined | null): string {
    if (!input) return 'India';
    let str = String(input).trim();

    // Strip Devanagari character ranges [\u0900-\u097F]
    str = str.replace(/[\u0900-\u097F]+/g, '').trim();

    // Normalize Latin accents
    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Strip non-alphanumeric except spaces and hyphens
    str = str.replace(/[^a-zA-Z0-9\s-]/g, '').trim();

    if (!str || str.length < 2) return 'India';
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
          const rawCity = props.city || props.name || props.town || props.village || props.county || 'Unknown';
          const city = this.sanitizeEnglishCityName(rawCity);
          const state = this.sanitizeEnglishCityName(props.state || '');
          const country = props.country || '';
          
          let displayName = city;
          if (state && state !== city) displayName += `, ${state}`;
          
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
