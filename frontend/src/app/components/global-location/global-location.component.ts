import { Component, OnInit, OnDestroy, Input, HostListener, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationService, LocationData } from '../../services/location.service';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-global-location',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- The Minimal Location Trigger (Global Context) -->
    <div class="premium-pill" (click)="openModal()" *ngIf="context === 'global'" title="Select Location">
      <svg class="pill-icon-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
      <span class="pill-text">{{ isDetecting ? 'Detecting location...' : (currentLocation?.displayName || 'Location') }}</span>
      <svg class="pill-chevron-svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>

    <!-- The Override Badge (Page Context) -->
    <div class="override-badge" (click)="openModal()" *ngIf="context !== 'global'">
      <div class="badge-content">
        <span class="lbl">{{ isUsingGlobal ? '🌐 Using Global Location' : '📍 Using Local Override' }}</span>
        <span class="val">{{ isDetecting ? 'Detecting location...' : (currentLocation?.displayName || 'Location') }}</span>
      </div>
      <span class="change-btn">Change</span>
    </div>

    <!-- Command Palette Modal -->
    <div class="palette-overlay" *ngIf="isModalOpen" (click)="closeModal()">
      <div class="palette-content" (click)="$event.stopPropagation()">
        
        <!-- Search Header -->
        <div class="palette-header">
          <span class="search-icon">🔍</span>
          <input 
            #searchInput
            type="text" 
            class="search-input"
            placeholder="Search city, district or state..." 
            [(ngModel)]="searchQuery"
            (input)="onSearchChange(searchQuery)"
            (keydown)="onKeyDown($event)"
          />
          <button class="close-icon-btn" (click)="closeModal()">✕</button>
        </div>

        <!-- Palette Body -->
        <div class="palette-body">
          
          <!-- State: Idle (No search query) -->
          <ng-container *ngIf="!searchQuery">
            
            <!-- GPS Detection Card -->
            <div class="gps-card" (click)="detectGPS()" [class.detecting]="gpsState === 'detecting'" [class.success]="gpsState === 'success'">
              <div class="gps-icon-wrapper">
                <span class="gps-icon" *ngIf="gpsState === 'idle'">📡</span>
                <div class="spinner" *ngIf="gpsState === 'detecting'"></div>
                <span class="gps-icon success-icon" *ngIf="gpsState === 'success'">✓</span>
              </div>
              <div class="gps-text">
                <div class="gps-title" *ngIf="gpsState === 'idle'">Use Current Location</div>
                <div class="gps-title" *ngIf="gpsState === 'detecting'">Detecting...</div>
                <div class="gps-title" *ngIf="gpsState === 'success'">Location Found</div>
                
                <div class="gps-sub" *ngIf="gpsState === 'idle'">Detect using GPS</div>
                <div class="gps-sub error-text" *ngIf="errorMsg">{{ errorMsg }}</div>
                <div class="gps-sub success-text" *ngIf="gpsState === 'success'">{{ currentLocation?.displayName }}</div>
              </div>
            </div>

            <!-- Recent Locations -->
            <div class="section-block" *ngIf="recentLocations.length > 0">
              <div class="section-title">Recent</div>
              <div class="recent-list">
                <div class="recent-item" *ngFor="let rec of recentLocations" (click)="selectResult(rec)">
                  <span class="r-icon">🕒</span>
                  <span class="r-text">{{ rec.displayName }}</span>
                </div>
              </div>
            </div>

            <!-- Popular Locations -->
            <div class="section-block">
              <div class="section-title">Popular Cities</div>
              <div class="popular-grid">
                <button class="pop-btn" *ngFor="let pop of popularCities" (click)="selectPopular(pop)">{{ pop }}</button>
              </div>
            </div>

          </ng-container>

          <!-- State: Searching -->
          <ng-container *ngIf="searchQuery">
            <div class="searching-state" *ngIf="isSearching">
              <div class="spinner small"></div>
              <span>Searching...</span>
            </div>
            
            <div class="suggestions-list" *ngIf="!isSearching && searchResults.length > 0">
              <div 
                class="suggestion-item" 
                *ngFor="let res of searchResults; let i = index"
                [class.active]="i === selectedIndex"
                (mouseenter)="selectedIndex = i"
                (click)="selectResult(res)"
              >
                <span class="s-icon">📍</span>
                <div class="s-text-block">
                  <div class="s-city">{{ res.city }}</div>
                  <div class="s-state" *ngIf="res.state">{{ res.state }}</div>
                </div>
              </div>
            </div>
            
            <div class="no-results" *ngIf="!isSearching && searchResults.length === 0 && searchQuery.length >= 2">
              No places found.
            </div>
          </ng-container>

        </div>

        <!-- Palette Footer -->
        <div class="palette-footer" *ngIf="context !== 'global'">
          <label class="custom-checkbox">
            <input type="checkbox" [(ngModel)]="setAsGlobal" />
            <span class="checkmark"></span>
            <span class="checkbox-label">Make this my default location</span>
          </label>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }

    /* Minimal Location Trigger Design */
    .premium-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      padding: 4px 2px;
      border-radius: 0;
      cursor: pointer;
      box-shadow: none;
      border: none;
      transition: opacity 0.2s ease;
      height: 32px;
      box-sizing: border-radius;
    }
    .premium-pill:hover {
      box-shadow: none;
      transform: none;
      background: transparent;
      opacity: 0.75;
    }
    .pill-icon-svg {
      color: #64748B;
      flex-shrink: 0;
      display: inline-block;
    }
    .pill-text {
      font-weight: 400;
      color: #475569;
      font-size: 0.85rem;
      max-width: 120px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1;
    }
    .pill-chevron-svg {
      color: #94A3B8;
      flex-shrink: 0;
      margin-left: 1px;
      display: inline-block;
    }

    /* Override Badge */
    .override-badge {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      background: rgba(255,255,255,0.9);
      backdrop-filter: blur(10px);
      border: 1px solid #E2E8F0;
      padding: 12px 18px;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 10px rgba(0,0,0,0.02);
      width: 100%;
    }
    .override-badge:hover {
      border-color: #CBD5E1;
      box-shadow: 0 4px 12px rgba(0,0,0,0.04);
      background: #ffffff;
    }
    .badge-content {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }
    .badge-content .lbl {
      font-size: 0.75rem;
      color: #64748B;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-content .val {
      font-weight: 700;
      color: #0F172A;
      font-size: 1.05rem;
    }
    .change-btn {
      font-size: 0.85rem;
      font-weight: 700;
      color: #7952FF;
      background: rgba(121, 82, 255, 0.08);
      padding: 6px 12px;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .override-badge:hover .change-btn {
      background: rgba(121, 82, 255, 0.15);
    }

    /* Command Palette Overlay */
    .palette-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.3);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 10vh;
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Palette Content */
    .palette-content {
      width: 100%;
      max-width: 550px;
      background: #FFFFFF;
      border-radius: 24px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05);
      overflow: hidden;
      animation: paletteSlideDown 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
      display: flex;
      flex-direction: column;
    }
    @keyframes paletteSlideDown {
      from { opacity: 0; transform: translateY(-20px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Palette Header (Search) */
    .palette-header {
      display: flex;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #F1F5F9;
      gap: 12px;
    }
    .search-icon {
      font-size: 1.2rem;
      color: #94A3B8;
    }
    .search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 1.15rem;
      color: #0F172A;
      background: transparent;
      font-family: inherit;
    }
    .search-input::placeholder {
      color: #94A3B8;
    }
    .close-icon-btn {
      background: #F1F5F9;
      border: none;
      color: #64748B;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .close-icon-btn:hover {
      background: #E2E8F0;
      color: #0F172A;
    }

    /* Palette Body */
    .palette-body {
      max-height: 60vh;
      overflow-y: auto;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* GPS Card */
    .gps-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .gps-card:hover:not(.detecting):not(.success) {
      background: #F1F5F9;
      border-color: #CBD5E1;
      transform: scale(0.99);
    }
    .gps-icon-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(121, 82, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .gps-icon {
      font-size: 1.2rem;
      color: #7952FF;
    }
    .gps-icon.success-icon {
      color: #10B981;
      font-weight: bold;
    }
    .gps-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .gps-title {
      font-weight: 600;
      color: #0F172A;
      font-size: 1rem;
    }
    .gps-sub {
      font-size: 0.8rem;
      color: #64748B;
    }
    .gps-sub.error-text {
      color: #EF4444;
    }
    .gps-sub.success-text {
      color: #10B981;
      font-weight: 500;
    }
    .gps-card.success .gps-icon-wrapper {
      background: rgba(16, 185, 129, 0.1);
    }

    /* Spinners */
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(121, 82, 255, 0.2);
      border-top-color: #7952FF;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .spinner.small {
      width: 16px;
      height: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Sections */
    .section-block {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .section-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Recent List */
    .recent-list {
      display: flex;
      flex-direction: column;
    }
    .recent-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .recent-item:hover {
      background: #F8FAFC;
    }
    .r-icon {
      font-size: 1.1rem;
      color: #94A3B8;
    }
    .r-text {
      font-weight: 500;
      color: #1E293B;
      font-size: 0.95rem;
    }

    /* Popular Grid */
    .popular-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .pop-btn {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pop-btn:hover {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    /* Searching States */
    .searching-state {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px;
      color: #64748B;
      font-size: 0.9rem;
      justify-content: center;
    }
    .no-results {
      padding: 20px;
      text-align: center;
      color: #94A3B8;
      font-size: 0.9rem;
    }

    /* Suggestions List */
    .suggestions-list {
      display: flex;
      flex-direction: column;
    }
    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .suggestion-item.active, .suggestion-item:hover {
      background: #F8FAFC;
    }
    .s-icon {
      font-size: 1.2rem;
      color: #94A3B8;
    }
    .suggestion-item.active .s-icon {
      color: #7952FF;
    }
    .s-text-block {
      display: flex;
      flex-direction: column;
    }
    .s-city {
      font-weight: 600;
      color: #0F172A;
      font-size: 0.95rem;
    }
    .s-state {
      font-size: 0.8rem;
      color: #64748B;
    }

    /* Footer */
    .palette-footer {
      border-top: 1px solid #F1F5F9;
      padding: 12px 20px;
      background: #F8FAFC;
      display: flex;
      justify-content: flex-end;
    }

    /* Checkbox */
    .custom-checkbox {
      display: flex;
      align-items: center;
      position: relative;
      padding-left: 30px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
      user-select: none;
    }
    .custom-checkbox input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }
    .checkmark {
      position: absolute;
      top: -2px;
      left: 0;
      height: 20px;
      width: 20px;
      background-color: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .custom-checkbox:hover input ~ .checkmark {
      background-color: #F1F5F9;
    }
    .custom-checkbox input:checked ~ .checkmark {
      background-color: #7952FF;
      border-color: #7952FF;
    }
    .checkmark:after {
      content: "";
      position: absolute;
      display: none;
    }
    .custom-checkbox input:checked ~ .checkmark:after {
      display: block;
    }
    .custom-checkbox .checkmark:after {
      left: 7px;
      top: 3px;
      width: 4px;
      height: 9px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    
    @media (max-width: 768px) {
      .palette-overlay {
        padding-top: 5vh;
        padding-left: 10px;
        padding-right: 10px;
      }
      .palette-content {
        width: 100%;
        max-width: 100%;
        max-height: 85vh;
      }
      .palette-body {
        max-height: 60vh;
      }
    }
  `]
})
export class GlobalLocationComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() context: 'global' | 'charging' | 'energy' | 'planner' = 'global';
  @ViewChild('searchInput') searchInputElement!: ElementRef;
  
  currentLocation: LocationData | null = null;
  isUsingGlobal: boolean = true;
  isDetecting: boolean = true;
  
  isModalOpen = false;
  setAsGlobal = false;
  
  // GPS State
  gpsState: 'idle' | 'detecting' | 'success' = 'idle';
  errorMsg = '';

  // Data
  recentLocations: LocationData[] = [];
  popularCities = ['Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Pune', 'Chennai'];

  // Search
  searchQuery = '';
  searchResults: LocationData[] = [];
  isSearching = false;
  selectedIndex = -1;

  private searchSubject = new Subject<string>();
  private sub: Subscription | null = null;
  private detectingSub: Subscription | null = null;
  private focusTimeout: any;

  constructor(private locationService: LocationService) {}

  ngOnInit() {
    this.detectingSub = this.locationService.isDetecting$().subscribe(d => {
      this.isDetecting = d;
    });

    this.sub = this.locationService.getLocationForModule(this.context).subscribe(loc => {
      this.currentLocation = loc;
      // Determine if using global or local based on context and storage
      if (this.context !== 'global') {
        const hasOverride = !!sessionStorage.getItem(`evcorn_override_${this.context}`);
        this.isUsingGlobal = !hasOverride;
      } else {
        this.isUsingGlobal = true;
      }
    });

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(async (query) => {
      if (!query || query.length < 2) {
        this.searchResults = [];
        this.isSearching = false;
        return;
      }
      this.isSearching = true;
      this.searchResults = await this.locationService.searchLocations(query);
      this.selectedIndex = -1;
      this.isSearching = false;
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
    if (this.detectingSub) this.detectingSub.unsubscribe();
    if (this.focusTimeout) clearTimeout(this.focusTimeout);
  }

  ngAfterViewChecked() {}

  @HostListener('document:keydown.escape', ['$event'])
  onEsc(event: Event) {
    if (this.isModalOpen) {
      this.closeModal();
    }
  }

  openModal() {
    this.isModalOpen = true;
    this.searchQuery = '';
    this.searchResults = [];
    this.errorMsg = '';
    this.gpsState = 'idle';
    this.setAsGlobal = false;
    this.recentLocations = this.locationService.getRecentLocations();
    
    this.focusTimeout = setTimeout(() => {
      if (this.searchInputElement) {
        this.searchInputElement.nativeElement.focus();
      }
    }, 100);
  }

  closeModal() {
    this.isModalOpen = false;
  }

  onSearchChange(query: string) {
    this.searchSubject.next(query);
  }

  onKeyDown(event: KeyboardEvent) {
    if (this.searchResults.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.searchResults.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.searchResults.length) % this.searchResults.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.selectedIndex >= 0 && this.selectedIndex < this.searchResults.length) {
        this.selectResult(this.searchResults[this.selectedIndex]);
      }
    }
  }

  selectResult(result: LocationData) {
    this.locationService.setLocation(result, this.context, this.setAsGlobal);
    this.closeModal();
  }

  async selectPopular(cityName: string) {
    // Quick geocode hack to make it instant without full map
    // We can do a quick search and pick the first
    this.searchQuery = cityName;
    this.isSearching = true;
    const res = await this.locationService.searchLocations(cityName);
    this.isSearching = false;
    if (res && res.length > 0) {
      this.selectResult(res[0]);
    }
  }

  async detectGPS() {
    if (this.gpsState === 'detecting') return;
    
    this.gpsState = 'detecting';
    this.errorMsg = '';
    
    const success = await this.locationService.requestGeolocation(this.context, this.setAsGlobal);
    
    if (success) {
      this.gpsState = 'success';
      setTimeout(() => this.closeModal(), 800); // Wait for animation
    } else {
      this.gpsState = 'idle';
      this.errorMsg = 'We couldn\'t detect your location.';
    }
  }
}
