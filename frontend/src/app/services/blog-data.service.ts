import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { shareReplay, map } from 'rxjs/operators';

import { ArticleBlock } from '../models/blocks.model';

export interface Category {
  id: string; // e.g. 'tesla'
  name: string; // e.g. 'Tesla'
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  countryOrigin?: string;
}

export interface Pricing {
  exShowroomPriceINR: number;
  priceText: string;
  onRoadPriceEstINR?: number;
  subsidyEligible?: boolean;
}

export interface Battery {
  capacityKWh: number;
  capacityText: string;
  chemistry?: 'LFP' | 'NMC' | 'Sodium-Ion' | 'Solid-State' | 'Unknown';
  voltageArchitecture?: number;
}

export interface Charging {
  acChargingKW?: number;
  dcFastChargingKW?: number;
  acChargingText?: string;
  dcChargingText?: string;
  portType?: string;
}

export interface Performance {
  claimedRangeKM: number;
  rangeText: string;
  maxPowerBHP?: number;
  maxTorqueNM?: number;
  acceleration0to100Sec?: number;
  topSpeedKMH?: number;
  drivetrain?: 'FWD' | 'RWD' | 'AWD' | 'FWD/AWD' | 'N/A';
}

export interface Dimensions {
  lengthMM?: number;
  widthMM?: number;
  heightMM?: number;
  dimensionsText?: string;
  groundClearanceMM?: number;
  groundClearanceText?: string;
  wheelbaseMM?: number;
  kerbWeightKG?: number;
  grossWeightKG?: number;
  bootSpaceLiters?: number;
  frunkSpaceLiters?: number;
  bootFrunkText?: string;
  seatingCapacity?: number;
  seatingText?: string;
  tyreSize?: string;
}

export interface Media {
  mainImage?: string;
  gallery?: string[];
  cloudinaryMainImage?: { url: string; public_id: string };
  cloudinaryImages?: Array<{ url: string; public_id: string }>;
}

export interface Safety {
  ncapRating?: number;
  safetyRatingText?: string;
  ncapTestingBody?: string;
  airbagsCount?: number;
  hasADAS?: boolean;
}

export interface SEO {
  metaTitle?: string;
  metaDescription?: string;
}

export interface VehicleVariant {
  id: string;
  variantId: string;
  variantSlug: string;
  variantName: string;
  modelId: string;
  modelSlug: string;
  brandId: string;
  brandSlug: string;
  pricing: Pricing;
  battery: Battery;
  charging: Charging;
  performance: Performance;
  dimensions: Dimensions;
  media: Media;
  safety: Safety;
}

export interface VehicleModel {
  id: string;
  modelId: string;
  modelSlug: string;
  modelName: string;
  brandId: string;
  brandSlug: string;
  variants: VehicleVariant[];
}

export interface Article {
  id?: string;
  title: string;
  description?: string;
  categoryId?: string;
  imageUrl?: string;
  paragraphs: string[];
  blocks?: ArticleBlock[]; // NEW dynamic blocks array
  active: boolean;
  createdAt?: string;
}

export interface CarSpec {
  id?: string; // Custom string identifier, e.g. 'tesla-model-3'
  name: string;
  categoryId: string;
  brandSlug?: string;
  modelId?: string;
  modelSlug?: string;
  variantId?: string;
  variantSlug?: string;
  parentModel?: string; // e.g. 'Nexon EV'
  variantName?: string; // e.g. 'Empowered+ LR'
  imageUrl?: string; // e.g. base64 or Cloudinary URL
  galleryImages?: string[];
  price: string;
  seating: string;
  dimensions: string; // Length x Width x Height
  groundClearance: string;
  batteryCapacity: string;
  acCharging?: string; // e.g. '11 kW'
  dcCharging?: string; // e.g. '150 kW'
  range?: string; // e.g. '526 km'
  tyreSize: string;
  bootFrunkSpace: string;
  bhpTorque: string;
  drivetrain: string;
  safetyRating: string;
  keyHighlights?: string;
  imageBorrowed?: boolean;
  colour?: string;
  weight?: string;
  screen?: string;
  audio?: string;
  connectivity?: string;
  adasLevel?: string;
  airbags?: string;
  bodyStyle?: string;
  wheelbase?: string;
  kerbWeight?: string;
  grossWeight?: string;
  acceleration?: string;
  maxPower?: string;
  torque?: string;

  // Temporary Dual-Model Compatibility Layer (Deprecated - To be removed after consumer migration)
  pricing?: Pricing;
  battery?: Battery;
  charging?: Charging;
  performance?: Performance;
  dimensionsObj?: Dimensions;
  media?: Media;
  safety?: Safety;
  seo?: SEO;
}

@Injectable({
  providedIn: 'root'
})
export class BlogDataService {
  private readonly apiUrl = (() => {
    if (typeof window === 'undefined') {
      return 'http://localhost:3000/api';
    }
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || 
                    host === '127.0.0.1' || 
                    host.startsWith('10.') || 
                    host.startsWith('192.') || 
                    host.startsWith('172.');
    return isLocal 
      ? `http://${host}:3000/api` 
      : 'https://evcorn-backend.onrender.com/api';
  })();

  // Caches for read-heavy static data
  private categoriesCache$: Observable<Category[]> | null = null;
  private articlesLightCache$: Observable<Partial<Article>[]> | null = null;
  private vehiclesLightCache$: Observable<Pick<CarSpec, 'id' | 'name' | 'categoryId' | 'parentModel'>[]> | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Upload single image file to Cloudinary via POST /api/upload
   */
  uploadImage(file: File): Observable<{ url: string; public_id: string; width: number; height: number; format: string; original_filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; public_id: string; width: number; height: number; format: string; original_filename: string }>(
      `${this.apiUrl}/upload`,
      formData
    );
  }

  /**
   * Delete single image from Cloudinary via POST /api/upload/delete
   */
  deleteImage(urlOrPublicId: string): Observable<{ success: boolean; result?: string }> {
    return this.http.post<{ success: boolean; result?: string }>(
      `${this.apiUrl}/upload/delete`,
      { public_id: urlOrPublicId }
    );
  }

  // Helper to construct authorization headers for Admin actions
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'x-admin-password': 'admin' // Matches ADMIN_PASSWORD in .env
    });
  }

  private loadCache(key: string): any {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  // 1. Categories / Brands API (Now fully dynamic from database!)
  getCategories(): Observable<Category[]> {
    if (!this.categoriesCache$) {
      const cached = this.loadCache('categories') || [];
      const subject = new BehaviorSubject<Category[]>(cached);
      
      this.http.get<Category[]>(`${this.apiUrl}/categories?t=${Date.now()}`).subscribe({
        next: (data) => {
          try { localStorage.setItem('categories', JSON.stringify(data)); } catch {}
          subject.next(data);
        },
        error: (err) => {
          if (cached.length === 0) subject.error(err);
        }
      });
      
      this.categoriesCache$ = subject.asObservable();
    }
    return this.categoriesCache$;
  }

  addCategory(catData: { id: string; name: string }): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/categories`, catData, { headers: this.getHeaders() });
  }

  deleteCategory(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/categories/${id}`, { headers: this.getHeaders() });
  }

  private articlesCache$: Observable<Article[]> | null = null;
  private articleByIdCache = new Map<string, Observable<Article>>();

  // 2. Articles API Calls
  getArticles(): Observable<Article[]> {
    if (!this.articlesCache$) {
      const cached = this.loadCache('articles') || [];
      const subject = new BehaviorSubject<Article[]>(cached);

      this.http.get<Article[]>(`${this.apiUrl}/articles`).subscribe({
        next: (data) => {
          try { localStorage.setItem('articles', JSON.stringify(data)); } catch {}
          subject.next(data);
        },
        error: (err) => {
          if (cached.length === 0) subject.error(err);
        }
      });

      this.articlesCache$ = subject.asObservable();
    }
    return this.articlesCache$;
  }

  // Lightweight list — overview cards only (no heavy body content) for articles list page
  getArticlesLight(): Observable<Partial<Article>[]> {
    if (!this.articlesLightCache$) {
      const cached = this.loadCache('articlesLight') || [];
      const subject = new BehaviorSubject<any[]>(cached);

      this.http.get<Partial<Article>[]>(`${this.apiUrl}/articles?light=true&t=${Date.now()}`).subscribe({
        next: (data) => {
          try { localStorage.setItem('articlesLight', JSON.stringify(data)); } catch {}
          subject.next(data);
        },
        error: (err) => {
          if (cached.length === 0) subject.error(err);
        }
      });

      this.articlesLightCache$ = subject.asObservable();
    }
    return this.articlesLightCache$;
  }

  getArticleById(id: string): Observable<Article> {
    if (!this.articleByIdCache.has(id)) {
      const cachedKey = `article_${id}`;
      const cached = this.loadCache(cachedKey);
      const subject = new BehaviorSubject<Article | null>(cached);

      this.http.get<Article>(`${this.apiUrl}/articles/${id}`).subscribe({
        next: (data) => {
          try { localStorage.setItem(cachedKey, JSON.stringify(data)); } catch {}
          subject.next(data);
        },
        error: (err) => {
          if (!cached) subject.error(err);
        }
      });

      this.articleByIdCache.set(id, subject.asObservable().pipe(
        map(art => art!)
      ));
    }
    return this.articleByIdCache.get(id)!;
  }

  addArticle(articleData: Article): Observable<Article> {
    return this.http.post<Article>(`${this.apiUrl}/articles`, articleData, { headers: this.getHeaders() });
  }

  updateArticle(id: string, articleData: Article): Observable<Article> {
    return this.http.put<Article>(`${this.apiUrl}/articles/${id}`, articleData, { headers: this.getHeaders() });
  }

  deleteArticle(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/articles/${id}`, { headers: this.getHeaders() });
  }

  private allVehiclesCache$: Observable<CarSpec[]> | null = null;
  
  getVehicles(): Observable<CarSpec[]> {
    if (!this.allVehiclesCache$) {
      const cached = this.loadCache('allVehicles') || [];
      const subject = new BehaviorSubject<CarSpec[]>(cached);

      this.http.get<CarSpec[]>(`${this.apiUrl}/vehicles?t=${Date.now()}`).pipe(
        map(vehicles => {
          const enriched = vehicles.map(v => this.enrichVehicle(v));
          return this.applyImageFallback(enriched);
        })
      ).subscribe({
        next: (data) => {
          try { localStorage.setItem('allVehicles', JSON.stringify(data)); } catch {}
          subject.next(data);
        },
        error: (err) => {
          if (cached.length === 0) subject.error(err);
        }
      });

      this.allVehiclesCache$ = subject.asObservable();
    }
    return this.allVehiclesCache$;
  }

  // Lightweight index — returns only id, name, categoryId for instant dropdown population
  getVehiclesLight(): Observable<Pick<CarSpec, 'id' | 'name' | 'categoryId' | 'parentModel' | 'variantName' | 'imageUrl' | 'bodyStyle'>[]> {
    if (!this.vehiclesLightCache$) {
      const cached = this.loadCache('vehiclesLight') || [];
      const subject = new BehaviorSubject<any[]>(cached);

      this.http.get<any[]>(`${this.apiUrl}/vehicles?light=true&t=${Date.now()}`).pipe(
        map(vehicles => {
          const enriched = vehicles.map(v => this.enrichVehicle(v));
          return this.applyImageFallback(enriched);
        })
      ).subscribe({
        next: (data) => {
          try { localStorage.setItem('vehiclesLight', JSON.stringify(data)); } catch {}
          subject.next(data);
        },
        error: (err) => {
          if (cached.length === 0) subject.error(err);
        }
      });

      this.vehiclesLightCache$ = subject.asObservable();
    }
    return this.vehiclesLightCache$;
  }

  private applyImageFallback(vehicles: any[]): any[] {
    const modelImages: Record<string, string> = {};
    const modelGalleries: Record<string, string[]> = {};
    const modelDimensions: Record<string, string> = {};
    const modelWheelbase: Record<string, string> = {};
    const modelGroundClearance: Record<string, string> = {};
    const modelBodyStyle: Record<string, string> = {};
    const modelBootFrunkSpace: Record<string, string> = {};

    for (const v of vehicles) {
      if (v.parentModel) {
        if (v.imageUrl && !modelImages[v.parentModel]) modelImages[v.parentModel] = v.imageUrl;
        if (v.galleryImages && v.galleryImages.length > 0 && !modelGalleries[v.parentModel]) modelGalleries[v.parentModel] = v.galleryImages;
        if (v.dimensions && v.dimensions !== 'N/A' && !modelDimensions[v.parentModel]) modelDimensions[v.parentModel] = v.dimensions;
        if (v.wheelbase && v.wheelbase !== 'N/A' && !modelWheelbase[v.parentModel]) modelWheelbase[v.parentModel] = v.wheelbase;
        if (v.groundClearance && v.groundClearance !== 'N/A' && !modelGroundClearance[v.parentModel]) modelGroundClearance[v.parentModel] = v.groundClearance;
        if (v.bodyStyle && v.bodyStyle !== 'N/A' && !modelBodyStyle[v.parentModel]) modelBodyStyle[v.parentModel] = v.bodyStyle;
        if (v.bootFrunkSpace && v.bootFrunkSpace !== 'N/A' && !modelBootFrunkSpace[v.parentModel]) modelBootFrunkSpace[v.parentModel] = v.bootFrunkSpace;
      }
    }
    
    for (const v of vehicles) {
      if (v.parentModel) {
        if (!v.imageUrl && modelImages[v.parentModel]) {
          v.imageUrl = modelImages[v.parentModel];
          v.imageBorrowed = true;
        }
        if ((!v.galleryImages || v.galleryImages.length === 0) && modelGalleries[v.parentModel]) {
          v.galleryImages = modelGalleries[v.parentModel];
        }
        if ((!v.dimensions || v.dimensions === 'N/A') && modelDimensions[v.parentModel]) v.dimensions = modelDimensions[v.parentModel];
        if ((!v.wheelbase || v.wheelbase === 'N/A') && modelWheelbase[v.parentModel]) v.wheelbase = modelWheelbase[v.parentModel];
        if ((!v.groundClearance || v.groundClearance === 'N/A') && modelGroundClearance[v.parentModel]) v.groundClearance = modelGroundClearance[v.parentModel];
        if ((!v.bodyStyle || v.bodyStyle === 'N/A') && modelBodyStyle[v.parentModel]) v.bodyStyle = modelBodyStyle[v.parentModel];
        if ((!v.bootFrunkSpace || v.bootFrunkSpace === 'N/A') && modelBootFrunkSpace[v.parentModel]) v.bootFrunkSpace = modelBootFrunkSpace[v.parentModel];
      }
    }
    return vehicles;
  }

  // Parse custom name delimiter since backend drops parentModel/variantName fields
  private enrichVehicle(v: any): any {
    if (v.name && v.name.includes('::')) {
      const parts = v.name.split('::');
      v.parentModel = parts[0];
      v.variantName = parts[1];
      v.name = `${parts[0]} ${parts[1]}`;
    } else {
      v.parentModel = v.parentModel || v.name;
      v.variantName = v.variantName || v.name;
    }
    
    // Parse AC/DC charging, ImageUrl, Range, and KeyHighlights hidden in batteryCapacity
    if (v.batteryCapacity && v.batteryCapacity.includes('||')) {
      const capParts = v.batteryCapacity.split('||');
      v.batteryCapacity = capParts[0] !== 'N/A' ? capParts[0] : '';
      v.acCharging = capParts[1] !== 'N/A' ? capParts[1] : undefined;
      v.dcCharging = capParts[2] !== 'N/A' ? capParts[2] : undefined;
      if (capParts.length > 3 && capParts[3] !== 'N/A') {
        const rawImg = capParts[3];
        if (rawImg.includes(';;;')) {
          v.galleryImages = rawImg.split(';;;').filter((img: string) => img && img !== 'N/A');
          v.imageUrl = v.galleryImages[0] || '';
        } else {
          v.imageUrl = rawImg;
          v.galleryImages = [rawImg];
        }
      }
      if (capParts.length > 4 && capParts[4] !== 'N/A') {
        v.range = capParts[4];
      }
      if (capParts.length > 5 && capParts[5] !== 'N/A') {
        v.keyHighlights = capParts[5];
      }
      if (capParts.length > 6 && capParts[6] !== 'N/A') {
        v.bodyStyle = capParts[6];
      }
    }
    
    // Parse dimensions and wheelbase
    if (v.dimensions && v.dimensions.includes('||')) {
      const dimParts = v.dimensions.split('||');
      v.dimensions = dimParts[0] !== 'N/A' ? dimParts[0] : '';
      if (dimParts.length > 1 && dimParts[1] !== 'N/A') v.wheelbase = dimParts[1];
    }

    // Parse Colour, Weight (Kerb/Gross), and Entertainment fields hidden in seating
    if (v.seating && v.seating.includes('||')) {
      const seatParts = v.seating.split('||');
      v.seating = seatParts[0] !== 'N/A' ? seatParts[0] : '';
      if (seatParts.length > 1 && seatParts[1] !== 'N/A') v.colour = seatParts[1];
      if (seatParts.length > 2 && seatParts[2] !== 'N/A') {
        v.weight = seatParts[2];
        if (v.weight.includes('~')) {
          const wParts = v.weight.split('~');
          v.kerbWeight = wParts[0] !== 'N/A' ? wParts[0] : undefined;
          v.grossWeight = wParts[1] !== 'N/A' ? wParts[1] : undefined;
        } else {
          v.kerbWeight = v.weight;
        }
      }
      if (seatParts.length > 3 && seatParts[3] !== 'N/A') v.screen = seatParts[3];
      if (seatParts.length > 4 && seatParts[4] !== 'N/A') v.audio = seatParts[4];
      if (seatParts.length > 5 && seatParts[5] !== 'N/A') v.connectivity = seatParts[5];
    }
    
    // Parse ADAS and Airbags hidden in safetyRating
    if (v.safetyRating && v.safetyRating.includes('||')) {
      const safeParts = v.safetyRating.split('||');
      v.safetyRating = safeParts[0] !== 'N/A' ? safeParts[0] : '';
      if (safeParts.length > 1 && safeParts[1] !== 'N/A') v.adasLevel = safeParts[1];
      if (safeParts.length > 2 && safeParts[2] !== 'N/A') v.airbags = safeParts[2];
    }

    // Parse Acceleration, Max Power, Torque hidden in bhpTorque
    if (v.bhpTorque) {
      if (v.bhpTorque.includes('||')) {
        const perfParts = v.bhpTorque.split('||');
        if (perfParts[0] !== 'N/A') v.acceleration = perfParts[0];
        if (perfParts.length > 1 && perfParts[1] !== 'N/A') v.maxPower = perfParts[1];
        if (perfParts.length > 2 && perfParts[2] !== 'N/A') v.torque = perfParts[2];
      } else if (v.bhpTorque.includes('/')) {
        const parts = v.bhpTorque.split('/');
        v.maxPower = parts[0].trim();
        v.torque = parts[1].trim();
      } else {
        v.maxPower = v.bhpTorque;
      }
    }
    
    return v;
  }

  // On-demand single car detail — fetches full specs for one car only
  // (Since backend doesn't support /vehicles/:id, we filter from the cached all-vehicles list)
  getVehicleById(id: string): Observable<CarSpec> {
    return this.getVehicles().pipe(
      map(vehicles => {
        const vehicle = vehicles.find(v => v.id === id);
        if (!vehicle) {
          throw new Error('Vehicle not found');
        }
        return vehicle;
      })
    );
  }

  saveVehicle(vehicleData: CarSpec): Observable<CarSpec> {
    return this.http.post<CarSpec>(`${this.apiUrl}/vehicles`, vehicleData, { headers: this.getHeaders() });
  }

  deleteVehicle(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/vehicles/${id}`, { headers: this.getHeaders() });
  }

  clearVehicleCache() {
    this.allVehiclesCache$ = null;
    this.vehiclesLightCache$ = null;
    try {
      localStorage.removeItem('allVehicles');
      localStorage.removeItem('vehiclesLight');
    } catch {}
  }
}
