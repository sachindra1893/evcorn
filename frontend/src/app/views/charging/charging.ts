import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { SeoService } from '../../services/seo.service';
import { SchemaService } from '../../services/schema.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LocationService } from '../../services/location.service';
import { GlobalLocationComponent } from '../../components/global-location/global-location.component';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

interface ChargingStation {
  name: string;
  lat: number;
  lng: number;
  city: string;
  operator: string;
  price: string;
  speed: string;
  socket: string;
  status: 'Available' | 'In Use';
  distanceFromStart?: number; // for trip planner
}

@Component({
  selector: 'app-charging',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, GlobalLocationComponent, BreadcrumbComponent, RouterLink],
  template: `
    <div class="charging-page">
      <!-- Glow decoration elements (watery color flow) -->
      <div class="glow-bg glow-cyan"></div>
      <div class="glow-bg glow-pink"></div>
      <div class="glow-bg glow-orange"></div>
      <div class="glow-bg glow-purple"></div>

      <!-- Watery Flow & Watermark Background -->
      <div class="watermark-container">
        <div class="bg-watermark-text">EVCorn</div>
        
        <svg class="bg-flow-svg" viewBox="0 0 1440 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="evcornFlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00D2FF" stop-opacity="0.12"/>
              <stop offset="35%" stop-color="#7952FF" stop-opacity="0.12"/>
              <stop offset="70%" stop-color="#FF007F" stop-opacity="0.12"/>
              <stop offset="100%" stop-color="#FF7F00" stop-opacity="0.12"/>
            </linearGradient>
            <linearGradient id="evcornFlowGradThin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00D2FF" stop-opacity="0.08"/>
              <stop offset="50%" stop-color="#FF007F" stop-opacity="0.08"/>
              <stop offset="100%" stop-color="#FF7F00" stop-opacity="0.08"/>
            </linearGradient>
          </defs>
          <path d="M-100 150 C 300 50, 500 350, 900 150 C 1200 50, 1300 250, 1600 180" 
                stroke="url(#evcornFlowGrad)" stroke-width="12" stroke-linecap="round"/>
          <path d="M-50 250 C 200 400, 600 100, 1000 300 C 1200 400, 1400 200, 1600 280" 
                stroke="url(#evcornFlowGradThin)" stroke-width="6" stroke-linecap="round"/>
        </svg>
      </div>

      <!-- Hero Header -->
      <header class="charging-hero animate-premium-fade">
        <app-breadcrumb [paths]="[{label: 'Charging Stations', url: '/charging'}]"></app-breadcrumb>
        <div style="margin-top: 15px;"><span class="charging-badge">Charger Finder</span></div>
        <h1>Nearby Charging Stations</h1>
        <p>Find real-time public EV charging stations. Filter by speed, socket type, or operator and navigate directly.</p>
      </header>

      <!-- Finder Grid Layout -->
      <section class="finder-grid animate-premium-fade">
        <!-- Control Panel (Bottom Sheet on Mobile) -->
        <div class="control-panel">
          <div class="drag-handle-mobile">
            <div class="drag-pill"></div>
          </div>
          <!-- Toggle: Search Mode vs. Trip Planner -->
          <div class="mode-selector">
            <button 
              [class.active]="activeMode === 'search'" 
              (click)="setMode('search')"
              class="mode-btn"
            >
              📍 Local Search
            </button>
            <button 
              [class.active]="activeMode === 'planner'" 
              (click)="setMode('planner')"
              class="mode-btn"
            >
              🛣️ Trip Planner
            </button>
          </div>

          <!-- Mode A: Local Search Controls -->
          <div *ngIf="activeMode === 'search'" class="mode-content">
            <!-- Filter Block: Global Location Sync -->
            <div class="filter-section">
              <h3>Current Location</h3>
              <app-global-location context="charging"></app-global-location>
              <p style="font-size: 0.8rem; color: #64748B; margin-top: 8px; line-height: 1.4;">
                Showing chargers near this location. Check the "Make default" box when changing if you want this to apply everywhere.
              </p>
            </div>

            <!-- Operator Filter Accordion -->
            <div class="filter-section" style="margin-bottom: 5px;">
              <button 
                (click)="showOperatorsDropdown = !showOperatorsDropdown"
                style="width: 100%; display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: 700; color: #334155; transition: all 0.2s;"
              >
                <span>⚙️ Filter by Network</span>
                <span style="font-size: 0.8rem;">{{ showOperatorsDropdown ? '▲' : '▼' }}</span>
              </button>
              
              <div *ngIf="showOperatorsDropdown" class="checkbox-list animate-fade" style="margin-top: 15px; padding: 0 5px;">
                <label *ngFor="let op of operators" class="custom-checkbox">
                  <input 
                    type="checkbox" 
                    [checked]="selectedOperators.has(op)" 
                    (change)="toggleOperator(op)"
                  />
                  <span class="checkmark"></span>
                  <span class="checkbox-label">{{ op }}</span>
                </label>
              </div>
            </div>

            <!-- Active Results Summary -->
            <div class="results-summary">
              <span>Found <strong>{{ getFilteredStations().length }}</strong> charging stations in this view</span>
            </div>

            <!-- List of Chargers (Local Search) -->
            <div class="local-chargers-list" *ngIf="getFilteredStations().length > 0" style="margin-top: 20px; display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; padding-right: 5px;">
              <div 
                *ngFor="let ch of getFilteredStations()" 
                (click)="focusOnMarker(ch.lat, ch.lng, ch.name)"
                class="timeline-card local-card"
                style="cursor: pointer; border-left: 4px solid #7952FF; padding-left: 15px;"
              >
                <div class="card-header-row">
                  <span class="operator-tag">{{ ch.operator }}</span>
                </div>
                <h4>{{ ch.name }}</h4>
                <p class="address-text">Socket: {{ ch.socket }} | Speed: {{ ch.speed }}</p>
                <div class="footer-row">
                  <span class="price-val">Rate: {{ ch.price }}</span>
                  <span class="status-indicator" [class.available]="ch.status === 'Available'">
                    {{ ch.status }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Mode B: Highway Trip Planner Controls -->
          <div *ngIf="activeMode === 'planner'" class="mode-content">
            <div class="filter-section">
              <h3>Calculate EV Highway Route</h3>
              
              <div class="route-input-group">
                <div class="input-field">
                  <label>Starting Point</label>
                  <div class="autocomplete-wrapper">
                    <input 
                      type="text" 
                      placeholder="e.g. Mumbai, Maharashtra" 
                      [(ngModel)]="startLocation"
                      (input)="startInputSubject.next(startLocation)"
                      (keyup.enter)="calculateRoute()"
                      class="premium-text-input"
                    />
                    <div *ngIf="startSuggestions.length > 0" class="suggestions-dropdown animate-fade">
                      <div 
                        *ngFor="let sug of startSuggestions" 
                        (click)="selectSuggestion(sug, 'start')"
                        class="suggestion-item"
                      >
                        {{ sug.display_name }}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="swap-btn-container">
                  <button (click)="swapLocations()" class="swap-btn" title="Swap Locations">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="8" y1="20" x2="8" y2="4"></line>
                      <polyline points="4 8 8 4 12 8"></polyline>
                      <line x1="16" y1="4" x2="16" y2="20"></line>
                      <polyline points="12 16 16 20 20 16"></polyline>
                    </svg>
                  </button>
                </div>

                <div class="input-field">
                  <label>Destination</label>
                  <div class="autocomplete-wrapper">
                    <input 
                      type="text" 
                      placeholder="e.g. Pune, Maharashtra" 
                      [(ngModel)]="endLocation"
                      (input)="endInputSubject.next(endLocation)"
                      (keyup.enter)="calculateRoute()"
                      class="premium-text-input"
                    />
                    <div *ngIf="endSuggestions.length > 0" class="suggestions-dropdown animate-fade">
                      <div 
                        *ngFor="let sug of endSuggestions" 
                        (click)="selectSuggestion(sug, 'end')"
                        class="suggestion-item"
                      >
                        {{ sug.display_name }}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  (click)="calculateRoute()" 
                  [disabled]="routeLoading" 
                  class="action-btn"
                >
                  <span *ngIf="!routeLoading">Calculate Route & Chargers</span>
                  <span *ngIf="routeLoading" class="btn-spinner"></span>
                </button>
              </div>
            </div>

            <!-- Route Result Metrics -->
            <div *ngIf="routeResult" class="route-metrics animate-fade">
              <h3>Route Info</h3>
              <div class="metrics-row">
                <div class="metric-box">
                  <span>🛣️ Distance</span>
                  <strong>{{ routeResult.distance }} km</strong>
                </div>
                <div class="metric-box">
                  <span>⏱️ Duration</span>
                  <strong>{{ routeResult.duration }}</strong>
                </div>
              </div>

              <!-- List of Chargers along route -->
              <div class="route-chargers-section">
                <h3>🔋 Chargers on your path ({{ routeChargers.length }})</h3>
                <div class="chargers-timeline">
                  <div *ngIf="routeChargers.length === 0" class="no-chargers-card">
                    No verified charging stations found within 20km of this highway corridor.
                  </div>
                  
                  <div 
                    *ngFor="let ch of routeChargers; let idx = index" 
                    (click)="focusOnMarker(ch.lat, ch.lng, ch.name)"
                    class="timeline-card"
                  >
                    <div class="timeline-dot"></div>
                    <div class="card-header-row">
                      <span class="operator-tag">{{ ch.operator }}</span>
                      <span class="distance-tag">+{{ ch.distanceFromStart | number:'1.0-0' }} km</span>
                    </div>
                    <h4>{{ ch.name }}</h4>
                    <p class="address-text">Socket: {{ ch.socket }} | Speed: {{ ch.speed }}</p>
                    <div class="footer-row">
                      <span class="price-val">Rate: {{ ch.price }}</span>
                      <span class="status-indicator" [class.available]="ch.status === 'Available'">
                        {{ ch.status }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Interactive Map Container (Right Column) -->
        <div class="map-panel">
          @if (mapLoading) {
            <div class="map-loading-overlay">
              <div class="spinner"></div>
              <p>Loading interactive open-source maps...</p>
            </div>
          }
          <div id="charging-map" class="map-element"></div>
        </div>
      </section>

      <!-- Related Content -->
      <section class="related-content-section animate-fade" style="margin-top: 60px; padding-top: 40px; border-top: 1px solid rgba(0,0,0,0.05); max-width: 1200px; margin: 60px auto 0 auto; position: relative; z-index: 1;">
        <h2 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 20px;">Explore More EV Tools</h2>
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
          <a routerLink="/energy" class="related-link-card" style="flex: 1; min-width: 280px; padding: 24px; background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); text-decoration: none; color: inherit; display: block;">
            <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; color: #0284C7;">Home Energy Simulator</h3>
            <p style="font-size: 0.9rem; color: #64748B;">Calculate solar requirements to charge your EV with 100% clean energy.</p>
          </a>
          <a routerLink="/compare" class="related-link-card" style="flex: 1; min-width: 280px; padding: 24px; background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); text-decoration: none; color: inherit; display: block;">
            <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; color: #7952FF;">Compare Electric Vehicles</h3>
            <p style="font-size: 0.9rem; color: #64748B;">Find an EV with fast-charging capabilities for highway trips.</p>
          </a>
        </div>
      </section>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');

    .related-link-card {
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .related-link-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.04);
    }

    .charging-page {
      min-height: 100vh;
      background: #FAFAFA;
      color: #0F172A;
      padding: 120px 24px 80px 24px;
      position: relative;
      overflow: hidden;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* Watermark and Flowing Curve backgrounds */
    .watermark-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
      overflow: hidden;
      user-select: none;
    }
    .bg-watermark-text {
      position: absolute;
      top: 36%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-8deg);
      font-family: 'Pacifico', cursive;
      font-size: 14vw;
      background: linear-gradient(to right, #00D2FF 0%, #7952FF 35%, #FF007F 70%, #FF7F00 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      opacity: 0.04;
      white-space: nowrap;
    }
    .bg-flow-svg {
      position: absolute;
      top: 200px;
      left: 0;
      width: 105%;
      height: 600px;
    }

    /* Glow decorations */
    .glow-bg {
      position: absolute;
      width: 450px;
      height: 450px;
      border-radius: 50%;
      filter: blur(140px);
      opacity: 0.08;
      z-index: -1;
      pointer-events: none;
      animation: floatBlobs 20s infinite alternate ease-in-out;
    }
    .glow-cyan {
      top: 10%;
      left: -100px;
      background: #00D2FF;
    }
    .glow-pink {
      top: 35%;
      right: -100px;
      background: #FF007F;
      animation-delay: -5s;
    }
    .glow-orange {
      bottom: 10%;
      left: 10%;
      background: #FF7F00;
      animation-delay: -10s;
    }
    .glow-purple {
      bottom: 25%;
      right: 15%;
      background: #7952FF;
      animation-delay: -15s;
    }

    @keyframes floatBlobs {
      0% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(60px, -40px) scale(1.1); }
      100% { transform: translate(-40px, 50px) scale(0.9); }
    }

    /* Hero section */
    .charging-hero {
      position: relative;
      z-index: 1;
      max-width: 800px;
      margin: 0 auto 50px auto;
      text-align: center;
    }
    .charging-badge {
      display: inline-block;
      padding: 6px 18px;
      background: linear-gradient(135deg, rgba(0, 210, 255, 0.08) 0%, rgba(255, 0, 127, 0.08) 100%);
      border: 1px solid rgba(121, 82, 255, 0.2);
      border-radius: 30px;
      color: #7952FF;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
      box-shadow: 0 4px 15px rgba(121, 82, 255, 0.05);
    }
    .charging-hero h1 {
      font-size: 3.2rem;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #0F172A;
      margin-bottom: 16px;
    }
    .charging-hero p {
      font-size: 1.15rem;
      line-height: 1.6;
      color: #64748B;
    }

    /* Finder Grid */
    .finder-grid {
      position: relative;
      z-index: 1;
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 30px;
    }

    /* Control Panel */
    .control-panel {
      background: #FFFFFF;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 24px;
      padding: 30px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.01);
      display: flex;
      flex-direction: column;
      gap: 25px;
      max-height: 750px;
      overflow-y: auto;
    }

    /* Mode Selector Toggle */
    .mode-selector {
      display: flex;
      background: #F1F5F9;
      border-radius: 12px;
      padding: 4px;
      border: 1px solid rgba(0,0,0,0.03);
    }
    .mode-btn {
      flex: 1;
      background: transparent;
      border: none;
      padding: 10px;
      font-size: 0.85rem;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .mode-btn.active {
      background: #FFFFFF;
      color: #7952FF;
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    }

    .mode-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .filter-section h3 {
      font-size: 0.95rem;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin: 0 0 15px 0;
      border-left: 3px solid #7952FF;
      padding-left: 8px;
    }

    /* City Quick Jump */
    .city-pill-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .city-pill {
      background: #F8FAFC;
      border: 1px solid rgba(0, 0, 0, 0.05);
      border-radius: 10px;
      padding: 10px;
      font-size: 0.85rem;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .city-pill:hover {
      background: #F1F5F9;
      color: #0F172A;
    }
    .city-pill.active {
      background: linear-gradient(135deg, #00D2FF 0%, #7952FF 100%);
      color: #FFFFFF;
      border-color: transparent;
      box-shadow: 0 4px 12px rgba(121, 82, 255, 0.2);
    }

    /* Checkbox list */
    .checkbox-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .custom-checkbox {
      display: flex;
      align-items: center;
      position: relative;
      padding-left: 30px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      color: #334155;
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
      top: 0;
      left: 0;
      height: 20px;
      width: 20px;
      background-color: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .custom-checkbox:hover input ~ .checkmark {
      background-color: #E2E8F0;
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
    .checkbox-label {
      line-height: 20px;
    }

    .results-summary {
      border-top: 1px solid rgba(0, 0, 0, 0.05);
      padding-top: 20px;
      font-size: 0.85rem;
      color: #64748B;
      text-align: center;
    }
    .results-summary strong {
      color: #7952FF;
    }

    /* Route inputs */
    .route-input-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .input-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .input-field label {
      font-size: 0.8rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .premium-text-input {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px;
      font-size: 0.9rem;
      color: #0F172A;
      outline: none;
      transition: all 0.2s;
    }
    .premium-text-input:focus {
      background: #FFFFFF;
      border-color: #7952FF;
      box-shadow: 0 0 0 3px rgba(121, 82, 255, 0.1);
    }
    .action-btn {
      background: #7952FF;
      color: #FFFFFF;
      border: none;
      padding: 12px;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .action-btn:hover {
      background: #633ec7;
      box-shadow: 0 4px 15px rgba(121, 82, 255, 0.2);
    }
    .action-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-spinner {
      border: 2px solid rgba(255,255,255,0.2);
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border-left-color: #FFFFFF;
      animation: spin 0.6s linear infinite;
    }

    /* Route metrics */
    .route-metrics {
      display: flex;
      flex-direction: column;
      gap: 20px;
      border-top: 1px solid rgba(0,0,0,0.05);
      padding-top: 20px;
    }
    .metrics-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .metric-box {
      background: #F8FAFC;
      border: 1px solid rgba(0,0,0,0.03);
      padding: 12px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .metric-box span {
      font-size: 0.75rem;
      color: #64748B;
    }
    .metric-box strong {
      font-size: 1.1rem;
      color: #0F172A;
    }

    /* Timeline stops */
    .route-chargers-section h3 {
      font-size: 0.9rem;
      margin-bottom: 12px;
    }
    .chargers-timeline {
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
      border-left: 2px dashed #E2E8F0;
      padding-left: 18px;
      margin-left: 8px;
      max-height: 350px;
      overflow-y: auto;
    }
    .no-chargers-card {
      font-size: 0.8rem;
      color: #94A3B8;
      line-height: 1.4;
      padding-top: 5px;
    }
    .timeline-card {
      background: #F8FAFC;
      border: 1px solid rgba(0,0,0,0.03);
      border-radius: 12px;
      padding: 12px;
      cursor: pointer;
      position: relative;
      transition: all 0.2s;
    }
    .timeline-card:hover {
      background: #FFFFFF;
      border-color: #7952FF;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(121, 82, 255, 0.08);
    }
    .timeline-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #7952FF;
      border: 2px solid #FFFFFF;
      position: absolute;
      left: -24px;
      top: 18px;
      box-shadow: 0 0 0 2px rgba(121,82,255,0.15);
    }
    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .operator-tag {
      font-size: 0.7rem;
      font-weight: 700;
      color: #7952FF;
      background: rgba(121, 82, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .distance-tag {
      font-size: 0.75rem;
      font-weight: 800;
      color: #059669;
    }
    .timeline-card h4 {
      font-size: 0.85rem;
      font-weight: 800;
      color: #0F172A;
      margin: 0 0 4px 0;
    }
    .address-text {
      font-size: 0.75rem;
      color: #64748B;
      margin: 0 0 8px 0;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
    }
    .price-val {
      font-weight: 700;
      color: #334155;
    }
    .status-indicator {
      font-weight: 700;
      color: #EF4444;
    }
    .status-indicator.available {
      color: #059669;
    }

    /* Autocomplete dropdown styles */
    .autocomplete-wrapper {
      position: relative;
      width: 100%;
    }
    .suggestions-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.08);
      z-index: 999;
      max-height: 200px;
      overflow-y: auto;
      margin-top: 4px;
    }
    .suggestion-item {
      padding: 10px 14px;
      font-size: 0.8rem;
      color: #334155;
      cursor: pointer;
      border-bottom: 1px solid #F1F5F9;
      transition: background 0.15s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: left;
    }
    .suggestion-item:last-child {
      border-bottom: none;
    }
    .suggestion-item:hover {
      background: #F8FAFC;
      color: #7952FF;
    }

    /* Swap Button */
    .swap-btn-container {
      display: flex;
      justify-content: center;
      margin: -10px 0 -5px 0;
      position: relative;
      z-index: 2;
    }
    .swap-btn {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #64748B;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .swap-btn:hover {
      background: #FFFFFF;
      color: #7952FF;
      border-color: rgba(121, 82, 255, 0.3);
      box-shadow: 0 4px 8px rgba(121, 82, 255, 0.1);
      transform: translateY(-1px);
    }
    .swap-btn:active {
      transform: translateY(1px);
    }

    /* Map Panel */
    .map-panel {
      background: #FFFFFF;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 24px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.01);
      position: relative;
      overflow: hidden;
      height: 600px;
    }
    .map-element {
      width: 100%;
      height: 100%;
      z-index: 1;
    }
    .map-loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.9);
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 15px;
    }
    .spinner {
      border: 3px solid rgba(121, 82, 255, 0.1);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border-left-color: #7952FF;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Custom Map layout pops */
    ::ng-deep .leaflet-popup-content-wrapper {
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      border: 1px solid rgba(0,0,0,0.04);
      padding: 4px;
    }
    ::ng-deep .leaflet-popup-content {
      font-family: 'Inter', sans-serif;
      color: #334155;
    }
    
    /* Drag Handle (Hidden on Desktop) */
    .drag-handle-mobile {
      display: none;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .finder-grid {
        grid-template-columns: 1fr;
      }
      .map-panel {
        height: 450px;
      }
    }
    @media (max-width: 768px) {
      .charging-hero { display: none; } /* Hide hero to maximize map space */
      .finder-grid {
        display: block;
        position: relative;
        height: calc(100vh - 70px);
        border-radius: 0;
        margin: -40px -20px -60px -20px; /* Bleed to edges */
      }
      .map-panel {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        height: 100%;
        border-radius: 0;
        border: none;
      }
      .control-panel {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        margin: 0;
        border-radius: 24px 24px 0 0;
        box-shadow: 0 -10px 40px rgba(0,0,0,0.15);
        max-height: 45vh;
        overflow-y: auto;
        z-index: 400;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        padding: 15px 20px 30px 20px;
      }
      .drag-handle-mobile {
        display: flex;
        justify-content: center;
        padding-bottom: 15px;
        position: sticky;
        top: 0;
        background: transparent;
        z-index: 10;
      }
      .drag-pill {
        width: 40px;
        height: 5px;
        background: #CBD5E1;
        border-radius: 10px;
      }
      .route-input-group { gap: 15px; }
      .related-content-section { display: none; }
    }
  `]
})
export class ChargingComponent implements OnInit, OnDestroy {
  // Mode selection state
  activeMode: 'search' | 'planner' = 'search';

  // Map References
  map: any = null;
  markersGroup: any = null;
  routeLine: any = null;
  mapLoading: boolean = true;

  // Filter States
  selectedCity: string = 'bangalore';
  selectedOperators = new Set<string>(['Tata Power', 'Zeon', 'Statiq', 'Jio-bp', 'Shell']);
  onlyFastDC: boolean = false;
  showOperatorsDropdown: boolean = false;

  // Trip Planner States
  startLocation: string = 'Mumbai';
  endLocation: string = 'Pune';
  routeLoading: boolean = false;
  routeResult: { distance: string; duration: string } | null = null;
  routeChargers: ChargingStation[] = [];

  // Autocomplete suggestions states
  startSuggestions: any[] = [];
  endSuggestions: any[] = [];
  selectedStartCoords: number[] | null = null;
  selectedEndCoords: number[] | null = null;

  startInputSubject = new Subject<string>();
  endInputSubject = new Subject<string>();

  // Global Location Sync
  globalCityName: string = '';
  private locSub: Subscription | null = null;

  // Static Cities list
  cities = [
    { id: 'bangalore', name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    { id: 'delhi', name: 'Delhi NCR', lat: 28.6139, lng: 77.2090 },
    { id: 'mumbai', name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { id: 'pune', name: 'Pune', lat: 18.5204, lng: 73.8567 },
    { id: 'hyderabad', name: 'Hyderabad', lat: 17.3850, lng: 78.4867 }
  ];

  // Static Operators list
  operators = ['Tata Power', 'Zeon', 'Statiq', 'Jio-bp', 'Shell'];

  // Seeded Charging Point Data Store (Local search backups)
  stations: ChargingStation[] = [
    // Bangalore
    { name: 'Tata Power Fast Charger - Indiranagar', lat: 12.97189, lng: 77.64115, city: 'bangalore', operator: 'Tata Power', price: '₹19/kWh', speed: '60 kW', socket: 'CCS2 (DC)', status: 'Available' },
    { name: 'Zeon Charging - Forum Mall Koramangala', lat: 12.93484, lng: 77.61895, city: 'bangalore', operator: 'Zeon', price: '₹22/kWh', speed: '50 kW', socket: 'CCS2 (DC)', status: 'Available' },
    { name: 'Statiq Charger - MG Road Metro Station', lat: 12.97548, lng: 77.60677, city: 'bangalore', operator: 'Statiq', price: '₹18/kWh', speed: '30 kW', socket: 'CCS2 (DC)', status: 'In Use' },
    { name: 'Jio-bp Pulse - Whitefield Main Road', lat: 12.9698, lng: 77.7499, city: 'bangalore', operator: 'Jio-bp', price: '₹17.5/kWh', speed: '60 kW', socket: 'CCS2 (DC)', status: 'Available' },
    { name: 'Shell Recharge - Yeshwanthpur Service Stn', lat: 13.0234, lng: 77.5567, city: 'bangalore', operator: 'Shell', price: '₹24/kWh', speed: '30 kW', socket: 'CCS2 (DC)', status: 'Available' },
    
    // Delhi
    { name: 'Jio-bp Pulse - Connaught Place Outer Circle', lat: 28.6304, lng: 77.2177, city: 'delhi', operator: 'Jio-bp', price: '₹17/kWh', speed: '60 kW', socket: 'CCS2 (DC)', status: 'Available' },
    { name: 'Tata Power EZ Charge - Select Citywalk Saket', lat: 28.5284, lng: 77.2191, city: 'delhi', operator: 'Tata Power', price: '₹20/kWh', speed: '120 kW', socket: 'CCS2 (DC)', status: 'Available' },
    { name: 'Shell Recharge - Dwarka Sector 10 Stn', lat: 28.5818, lng: 77.0594, city: 'delhi', operator: 'Shell', price: '₹24/kWh', speed: '30 kW', socket: 'CCS2 (DC)', status: 'In Use' },
    { name: 'Zeon Charging - Aerocity GMR Square', lat: 28.5521, lng: 77.1224, city: 'delhi', operator: 'Zeon', price: '₹21.5/kWh', speed: '50 kW', socket: 'CCS2 (DC)', status: 'Available' },
    { name: 'Statiq Hub - Sector 29 Gurgaon', lat: 28.4684, lng: 77.0637, city: 'delhi', operator: 'Statiq', price: '₹18/kWh', speed: '30 kW', socket: 'CCS2 (DC)', status: 'Available' },

    // Mumbai
    { name: 'Tata Power Fast Charger - BKC G-Block', lat: 19.0601, lng: 72.8621, city: 'mumbai', operator: 'Tata Power', price: '₹21/kWh', speed: '60 kW', socket: 'CCS2 (DC)', status: 'Available' },
    { name: 'Jio-bp Pulse - Bandra Linking Road', lat: 19.0544, lng: 72.8402, city: 'mumbai', operator: 'Jio-bp', price: '₹18/kWh', speed: '50 kW', socket: 'CCS2 (DC)', status: 'Available' },
    { name: 'Statiq Hub - Phoenix Palladium Lower Parel', lat: 18.9934, lng: 72.8248, city: 'mumbai', operator: 'Statiq', price: '₹19/kWh', speed: '30 kW', socket: 'CCS2 (DC)', status: 'Available' },
    { name: 'Shell Recharge - Vashi Sector 17', lat: 19.0718, lng: 73.0012, city: 'mumbai', operator: 'Shell', price: '₹24/kWh', speed: '60 kW', socket: 'CCS2 (DC)', status: 'In Use' },

    // Pune
    { name: 'Zeon Charging - Amanora Mall Town Centre', lat: 18.5204, lng: 73.9367, city: 'pune', operator: 'Zeon', price: '₹22/kWh', speed: '50 kW', socket: 'CCS2 (DC)', status: 'Available' },
    { name: 'Tata Power EZ Charge - DP Road Kothrud', lat: 18.5074, lng: 73.8077, city: 'pune', operator: 'Tata Power', price: '₹19/kWh', speed: '60 kW', socket: 'CCS2 (DC)', status: 'Available' },
    { name: 'Statiq Hub - Hinjewadi Phase 1', lat: 18.5912, lng: 73.7388, city: 'pune', operator: 'Statiq', price: '₹18/kWh', speed: '30 kW', socket: 'CCS2 (DC)', status: 'Available' },

    // Hyderabad
    { name: 'Statiq Hub - Jubilee Hills Road 36', lat: 17.4325, lng: 78.4075, city: 'hyderabad', operator: 'Statiq', price: '₹18/kWh', speed: '60 kW', socket: 'CCS2 (DC)', status: 'Available' },
    { name: 'Tata Power Fast Charger - Gachibowli DLF cybercity', lat: 17.4485, lng: 78.3741, city: 'hyderabad', operator: 'Tata Power', price: '₹20/kWh', speed: '30 kW', socket: 'CCS2 (DC)', status: 'In Use' },
    { name: 'Zeon Charging - Begumpet Main Road', lat: 17.4411, lng: 78.4612, city: 'hyderabad', operator: 'Zeon', price: '₹21.5/kWh', speed: '50 kW', socket: 'CCS2 (DC)', status: 'Available' }
  ];

  constructor(
    private http: HttpClient, 
    private cdr: ChangeDetectorRef,
    private seoService: SeoService,
    private schemaService: SchemaService,
    private locationService: LocationService
  ) {}

  ngOnInit() {
    this.seoService.updateSeo({
      title: 'EV Charging Stations India — Route Planner',
      description: 'Find EV charging stations near you in India. Plan your route, check charging speeds, connector types, and network availability for Tata, Zeon, Jio-bp and more.'
    });

    this.schemaService.setSchema([
      this.schemaService.buildBreadcrumbs([
        { name: 'Home', url: '' },
        { name: 'Charging', url: '/charging' }
      ]),
      this.schemaService.buildWebPage(
        'EV Charging Stations India — Route Planner',
        'Find EV charging stations near you in India. Plan your route, check charging speeds, connector types, and network availability.'
      )
    ]);

    // Sync with Module Location (Global or Override)
    this.locSub = this.locationService.getLocationForModule('charging').subscribe(loc => {
      if (loc) {
        this.globalCityName = loc.displayName;
        if (this.activeMode === 'search') {
          this.jumpToCoords(loc.lat, loc.lon);
        }
        // If trip planner is empty, default origin to global location
        if (!this.startLocation || this.startLocation === 'Mumbai') {
          this.startLocation = loc.displayName;
          this.selectedStartCoords = [loc.lat, loc.lon];
        }
      }
    });

    this.startInputSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe((val: string) => this.fetchSuggestions(val, 'start'));

    this.endInputSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe((val: string) => this.fetchSuggestions(val, 'end'));

    this.loadLeafletStylesAndScripts()
      .then(() => {
        this.mapLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.initMap(), 100);
      })
      .catch((err) => {
        console.error('Failed to load Leaflet resources dynamically:', err);
      });
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
    if (this.locSub) {
      this.locSub.unsubscribe();
    }
  }

  private loadLeafletStylesAndScripts(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).L) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.onerror = () => reject(new Error('Failed to load Leaflet CSS'));
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Leaflet script'));
      document.head.appendChild(script);
    });
  }

  private initMap() {
    const L = (window as any).L;
    if (!L) return;

    this.map = L.map('charging-map', {
      zoomControl: true,
      attributionControl: true
    }).setView([12.9716, 77.5946], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.markersGroup = L.layerGroup().addTo(this.map);
    
    // Check if we have a global location loaded
    const currentLoc = localStorage.getItem('evcorn_global_location');
    if (currentLoc) {
      const parsed = JSON.parse(currentLoc);
      this.jumpToCoords(parsed.lat, parsed.lon);
    } else {
      this.jumpToCoords(12.9716, 77.5946); // Default Bangalore
    }
  }

  setMode(mode: 'search' | 'planner') {
    this.activeMode = mode;
    this.clearRoute();
    this.renderMarkers();
  }

  getFilteredStations(): ChargingStation[] {
    if (this.activeMode === 'planner') {
      return this.routeChargers;
    }

    // Known operators from the UI checkboxes
    const knownOperators = ['Tata Power', 'Zeon', 'Statiq', 'Jio-bp', 'Shell'];

    return this.stations.filter(st => {
      // Allow dynamic search markers through, else match city shortcut ID
      if (st.city !== 'dynamic' && st.city !== this.selectedCity) return false;
      
      // If it's a known operator, respect the checkbox filter.
      // If it's an unknown operator (e.g. from Overpass), always show it.
      if (knownOperators.includes(st.operator)) {
        if (!this.selectedOperators.has(st.operator)) return false;
      }
      
      if (this.onlyFastDC) {
        const speedValue = parseInt(st.speed.replace(/[^\d]/g, ''), 10);
        if (speedValue < 50) return false;
      }
      return true;
    });
  }

  renderMarkers() {
    const L = (window as any).L;
    if (!L || !this.map || !this.markersGroup) return;

    this.markersGroup.clearLayers();

    const filtered = this.getFilteredStations();
    filtered.forEach(st => {
      const markerColor = st.status === 'Available' ? '#10B981' : '#EF4444';
      
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background-color: ${markerColor}; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const popupHtml = `
        <div style="font-family: 'Inter', sans-serif; padding: 6px; min-width: 220px;">
          <h4 style="margin: 0 0 6px 0; font-size: 0.95rem; font-weight: 800; color: #0F172A;">${st.name}</h4>
          <div style="display: flex; gap: 8px; margin-bottom: 8px; font-size: 0.75rem; font-weight: 700;">
            <span style="background: rgba(121, 82, 255, 0.08); color: #7952FF; padding: 2px 6px; border-radius: 4px;">${st.operator}</span>
            <span style="background: rgba(16, 185, 129, 0.08); color: #059669; padding: 2px 6px; border-radius: 4px;">${st.speed}</span>
          </div>
          <div style="font-size: 0.8rem; margin-bottom: 12px; color: #475569; display: flex; flex-direction: column; gap: 3px;">
            <span>💰 Rate: <strong>${st.price}</strong></span>
            <span>🔌 Socket: <strong>${st.socket}</strong></span>
            <span>🟢 Status: <strong style="color: ${st.status === 'Available' ? '#059669' : '#EF4444'}">${st.status}</strong></span>
          </div>
          <a href="https://www.google.com/maps/search/?api=1&query=${st.lat},${st.lng}" target="_blank" 
             style="display: block; text-align: center; background: #7952FF; color: white; padding: 8px 12px; border-radius: 8px; text-decoration: none; font-size: 0.8rem; font-weight: 700; transition: background 0.2s;">
             Get Directions →
          </a>
        </div>
      `;

      L.marker([st.lat, st.lng], { icon: customIcon })
        .bindPopup(popupHtml)
        .addTo(this.markersGroup);
    });
  }

  focusOnMarker(lat: number, lng: number, popupText: string) {
    if (this.map) {
      this.map.setView([lat, lng], 14);
      // Automatically search markers in markersGroup layer to pop open
      this.markersGroup.eachLayer((layer: any) => {
        if (layer.getLatLng && layer.getLatLng().lat === lat && layer.getLatLng().lng === lng) {
          layer.openPopup();
        }
      });
    }
  }

  jumpToCoords(lat: number, lng: number) {
    this.selectedCity = 'dynamic';
    if (this.map) {
      this.map.setView([lat, lng], 12);
    }
    this.fetchLocalCityChargers(lat, lng);
  }

  // Fetch local EV chargers from live Overpass API
  fetchLocalCityChargers(lat: number, lng: number) {
    this.mapLoading = true;
    this.cdr.detectChanges();

    // Reverting to Overpass API (OpenStreetMap) because OCM developer portal is down.
    // Expanding the search radius to 100km (100,000 meters) to find more stations in India.
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="charging_station"](around:100000,${lat},${lng});
      );
      out body;
    `;

    const url = 'https://overpass-api.de/api/interpreter';
    this.http.post<any>(url, overpassQuery).subscribe({
      next: (res) => {
        this.stations = [];

        if (res && res.elements) {
          res.elements.forEach((el: any) => {
            const name = el.tags.name || el.tags.operator || 'Verified EV Charging Point';
            const operator = el.tags.operator || el.tags.brand || 'Public Network';
            const socket = el.tags.socket || el.tags.connector || 'CCS2 (DC)';
            const speed = el.tags.power || el.tags.capacity || '50 kW';
            const price = el.tags.fee === 'no' ? 'Free' : 'Paid';

            this.stations.push({
              name,
              lat: el.lat,
              lng: el.lon,
              city: 'dynamic',
              operator,
              price,
              speed,
              socket,
              status: 'Available'
            });
          });
        }
        
        this.renderMarkers();
        this.mapLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Overpass local query failed:', err);
        this.mapLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleOperator(operatorName: string) {
    if (this.selectedOperators.has(operatorName)) {
      this.selectedOperators.delete(operatorName);
    } else {
      this.selectedOperators.add(operatorName);
    }
    this.renderMarkers();
  }

  toggleSpeedFilter() {
    this.onlyFastDC = !this.onlyFastDC;
    this.renderMarkers();
  }

  // --- TRIP PLANNER IMPLEMENTATION ---

  // Autocomplete suggestions queries
  fetchSuggestions(query: string, type: 'start' | 'end') {
    if (!query || query.trim().length < 3) {
      if (type === 'start') {
        this.startSuggestions = [];
        this.selectedStartCoords = null;
      } else {
        this.endSuggestions = [];
        this.selectedEndCoords = null;
      }
      this.cdr.detectChanges();
      return;
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=en&q=${encodeURIComponent(query)}`;
    this.http.get<any[]>(url).subscribe({
      next: (res) => {
        if (type === 'start') {
          this.startSuggestions = res || [];
        } else {
          this.endSuggestions = res || [];
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Suggestions query failed:', err);
      }
    });
  }

  selectSuggestion(sug: any, type: 'start' | 'end') {
    if (type === 'start') {
      this.startLocation = sug.display_name;
      this.selectedStartCoords = [parseFloat(sug.lat), parseFloat(sug.lon)];
      this.startSuggestions = [];
    } else {
      this.endLocation = sug.display_name;
      this.selectedEndCoords = [parseFloat(sug.lat), parseFloat(sug.lon)];
      this.endSuggestions = [];
    }
    this.cdr.detectChanges();
  }

  swapLocations() {
    // Swap text locations
    const tempLoc = this.startLocation;
    this.startLocation = this.endLocation;
    this.endLocation = tempLoc;

    // Swap coordinates
    const tempCoords = this.selectedStartCoords;
    this.selectedStartCoords = this.selectedEndCoords;
    this.selectedEndCoords = tempCoords;

    // Trigger calculation automatically if both have values
    if (this.startLocation && this.endLocation) {
      this.calculateRoute();
    }
  }

  calculateRoute() {
    if (!this.startLocation.trim() || !this.endLocation.trim()) {
      alert('Please fill in both Starting point and Destination!');
      return;
    }

    this.routeLoading = true;
    this.cdr.detectChanges();

    // Check if we already have selected suggestions coordinates
    if (this.selectedStartCoords && this.selectedEndCoords) {
      const startObj = [{ lon: this.selectedStartCoords[1], lat: this.selectedStartCoords[0] }];
      const endObj = [{ lon: this.selectedEndCoords[1], lat: this.selectedEndCoords[0] }];
      this.fetchOSRMRoute(startObj, endObj);
      return;
    }

    // Fallback search geocoding
    this.geocodeAddress(this.startLocation)
      .subscribe({
        next: (startCoords) => {
          if (!startCoords || startCoords.length === 0) {
            alert(`Could not find starting point: "${this.startLocation}". Please select a suggestion or be more specific.`);
            this.routeLoading = false;
            this.cdr.detectChanges();
            return;
          }

          this.geocodeAddress(this.endLocation)
            .subscribe({
              next: (endCoords) => {
                if (!endCoords || endCoords.length === 0) {
                  alert(`Could not find destination: "${this.endLocation}". Please select a suggestion or be more specific.`);
                  this.routeLoading = false;
                  this.cdr.detectChanges();
                  return;
                }

                this.fetchOSRMRoute(startCoords, endCoords);
              },
              error: () => this.handleRouteError('Geocoding destination failed.')
            });
        },
        error: () => this.handleRouteError('Geocoding starting point failed.')
      });
  }

  private geocodeAddress(query: string) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=en&q=${encodeURIComponent(query)}`;
    return this.http.get<any[]>(url);
  }

  private fetchOSRMRoute(start: any[], end: any[]) {
    const startCoords = [start[0].lon, start[0].lat];
    const endCoords = [end[0].lon, end[0].lat];

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords.join(',')};${endCoords.join(',')}?overview=full&geometries=geojson`;

    this.http.get<any>(osrmUrl)
      .subscribe({
        next: (res) => {
          if (!res || !res.routes || res.routes.length === 0) {
            alert('No highway driving routes found between those locations!');
            this.routeLoading = false;
            this.cdr.detectChanges();
            return;
          }

          const route = res.routes[0];
          const distanceKm = (route.distance / 1000).toFixed(0);
          const durationHours = Math.floor(route.duration / 3600);
          const durationMins = Math.round((route.duration % 3600) / 60);

          this.routeResult = {
            distance: distanceKm,
            duration: `${durationHours}h ${durationMins}m`
          };

          // Render route path on Leaflet Map
          this.drawRoutePath(route.geometry);

          // Query real Overpass chargers along this route path
          this.fetchOverpassChargers(route.geometry.coordinates, startCoords);
        },
        error: () => this.handleRouteError('Failed to fetch driving route from OSRM server.')
      });
  }

  private drawRoutePath(geometry: any) {
    const L = (window as any).L;
    if (!L || !this.map) return;

    if (this.routeLine) {
      this.routeLine.remove();
    }

    // Convert GeoJSON coords [lng, lat] to Leaflet format [lat, lng]
    const leafletCoords = geometry.coordinates.map((c: number[]) => [c[1], c[0]]);

    // Draw route line
    this.routeLine = L.polyline(leafletCoords, {
      color: '#7952FF',
      weight: 6,
      opacity: 0.85
    }).addTo(this.map);

    // Zoom map bounds to fit route
    this.map.fitBounds(this.routeLine.getBounds(), { padding: [40, 40] });
  }

  private fetchOverpassChargers(routeCoords: number[][], startCoords: number[]) {
    // Sample up to 5 coordinates along route to run query
    const sampleSize = Math.min(5, routeCoords.length);
    const step = Math.floor(routeCoords.length / sampleSize);
    const sampledPoints: number[][] = [];
    
    for (let i = 0; i < sampleSize; i++) {
      sampledPoints.push(routeCoords[i * step]);
    }
    // Always include destination
    sampledPoints.push(routeCoords[routeCoords.length - 1]);

    // Build Overpass around queries within 18km of each highway point
    const aroundQueries = sampledPoints
      .map(pt => `node["amenity"="charging_station"](around:18000,${pt[1]},${pt[0]});`)
      .join('\n');

    const overpassQuery = `
      [out:json][timeout:25];
      (
        ${aroundQueries}
      );
      out body;
    `;

    const url = 'https://overpass-api.de/api/interpreter';
    this.http.post<any>(url, overpassQuery)
      .subscribe({
        next: (res) => {
          this.routeChargers = [];

          if (res && res.elements) {
            res.elements.forEach((el: any) => {
              const name = el.tags.name || el.tags.operator || 'Verified EV Charging Point';
              const operator = el.tags.operator || el.tags.brand || 'Public Network';
              const socket = el.tags.socket || el.tags.connector || 'CCS2 (DC)';
              const speed = el.tags.power || el.tags.capacity || '50 kW';
              const price = el.tags.fee === 'no' ? 'Free' : '₹18-22/kWh';

              // Calculate distance from start query
              const distFromStart = this.getHaversineDistance(startCoords[1], startCoords[0], el.lat, el.lon);

              this.routeChargers.push({
                name,
                lat: el.lat,
                lng: el.lon,
                city: 'route',
                operator,
                price,
                speed,
                socket,
                status: 'Available',
                distanceFromStart: distFromStart
              });
            });

            // Sort chargers chronologically along the route
            this.routeChargers.sort((a, b) => (a.distanceFromStart || 0) - (b.distanceFromStart || 0));
          }

          this.renderMarkers();
          this.routeLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          console.warn('Overpass API failed. Gracefully falling back to local database.');
          this.fallbackToLocalRouteChargers(routeCoords, startCoords);
        }
      });
  }

  private fallbackToLocalRouteChargers(routeCoords: number[][], startCoords: number[]) {
    this.routeChargers = [];
    
    // Sample a few points along the route to check distance against
    const sampleSize = 10;
    const step = Math.max(1, Math.floor(routeCoords.length / sampleSize));
    const sampledPoints: number[][] = [];
    for (let i = 0; i < routeCoords.length; i += step) {
      sampledPoints.push(routeCoords[i]);
    }
    sampledPoints.push(routeCoords[routeCoords.length - 1]);

    this.stations.forEach(st => {
      let isNearRoute = false;
      for (const pt of sampledPoints) {
         // pt is [lng, lat]
         const distToRoute = this.getHaversineDistance(st.lat, st.lng, pt[1], pt[0]);
         if (distToRoute < 25) { // Within 25km of the route
            isNearRoute = true;
            break;
         }
      }
      
      if (isNearRoute) {
         const distFromStart = this.getHaversineDistance(startCoords[1], startCoords[0], st.lat, st.lng);
         this.routeChargers.push({ ...st, city: 'route', distanceFromStart: distFromStart });
      }
    });
    
    this.routeChargers.sort((a, b) => (a.distanceFromStart || 0) - (b.distanceFromStart || 0));
    
    if (this.routeChargers.length === 0) {
      // If even fallback has no chargers, just let UI show empty state
      console.log('No fallback chargers found along route either.');
    }
    
    this.renderMarkers();
    this.routeLoading = false;
    this.cdr.detectChanges();
  }

  // Haversine formula to compute distance in km
  private getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private clearRoute() {
    if (this.routeLine) {
      this.routeLine.remove();
      this.routeLine = null;
    }
    this.routeResult = null;
    this.routeChargers = [];
  }

  private handleRouteError(errMsg: string) {
    console.error(errMsg);
    // Removed blocking alert(), updating UI state instead
    this.routeLoading = false;
    this.cdr.detectChanges();
  }
}
