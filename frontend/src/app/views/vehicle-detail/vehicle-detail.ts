import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CarSpec, Category, BlogDataService } from '../../services/blog-data.service';
import { SeoService } from '../../services/seo.service';
import { SchemaService } from '../../services/schema.service';
import { CompareStateService } from '../../services/compare-state.service';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { getOptimizedImageUrl, handleImageError } from '../../utils/image.utils';
import { combineLatest, Subscription } from 'rxjs';

interface OverviewData {
  priceRange: string;
  batteryOptions: string;
  claimedRange: string;
  charging: string;
}

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, BreadcrumbComponent],
  template: `
    <div class="vehicle-page animate-premium-fade">
      
      <!-- Premium Ambient Background -->
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0.4; z-index: 0;">
        <svg viewBox="0 0 1440 600" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;">
          <path d="M-100 150 C 300 50, 500 350, 900 150 C 1200 50, 1300 250, 1600 180" stroke="#00D2FF" stroke-width="1.5" stroke-opacity="0.12" stroke-linecap="round"/>
          <path d="M-50 250 C 200 400, 600 100, 1000 300 C 1200 400, 1400 200, 1600 280" stroke="#7952FF" stroke-width="1" stroke-opacity="0.1" stroke-linecap="round"/>
        </svg>
      </div>

      @if (loading) {
        <div class="loading-overlay" style="margin-top: 100px;">
          <div class="spinner"></div>
          <p>Loading vehicle data...</p>
        </div>
      } @else if (error) {
        <div class="error-container" style="margin-top: 100px; text-align: center; position: relative; z-index: 1;">
          @if (errorKind === 'network') {
            <h2>Unable to Load Vehicle Data</h2>
            <p>Please try again in a few moments.</p>
            <button type="button" (click)="retryLoad()" class="back-link" style="background: none; border: none; font: inherit; cursor: pointer; color: #0284C7; text-decoration: underline; margin-right: 16px;">↻ Try Again</button>
          } @else {
            <h2>Vehicle Not Found</h2>
            <p>We couldn't find the EV you're looking for.</p>
          }
          <a routerLink="/evs" class="back-link">← Back to Catalog</a>
        </div>
      } @else if (brand) {
        
        <div class="page-content" style="position: relative; z-index: 1;">
          <app-breadcrumb [paths]="[
            {label: 'Browse EVs', url: '/evs'},
            {label: brand.name, url: '/evs'},
            {label: modelName, url: ''}
          ]"></app-breadcrumb>
          
          <div class="hero-section animate-fade">
            <div class="hero-top-row">
              <div class="hero-text">
                <span class="brand-tag">{{ brand.name }}</span>
                <h1>{{ modelName }}</h1>
                
                <div class="overview-highlights">
                  <div class="highlight-item">
                    <span class="icon">💰</span>
                    <div class="highlight-text">
                      <strong>{{ overview.priceRange }}</strong>
                      <span>Price Range</span>
                    </div>
                  </div>
                  <div class="highlight-item">
                    <span class="icon">⚡</span>
                    <div class="highlight-text">
                      <strong>{{ overview.batteryOptions }}</strong>
                      <span>Battery Options</span>
                    </div>
                  </div>
                  <div class="highlight-item">
                    <span class="icon">🛣️</span>
                    <div class="highlight-text">
                      <strong>{{ overview.claimedRange }}</strong>
                      <span>Claimed Range</span>
                    </div>
                  </div>
                  <div class="highlight-item">
                    <span class="icon">🔌</span>
                    <div class="highlight-text">
                      <strong>{{ overview.charging }}</strong>
                      <span>DC Fast Charge</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="hero-visual" style="position: relative;">
                <div class="gallery-container" style="position: relative; width: 100%; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 20px; background: #FAFAFC; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 12px 30px rgba(0,0,0,0.04);">
                  
                  <img [src]="getOptimizedUrl(activeImageUrl, 1200, modelName)" 
                       (error)="onImgError($event, modelName)" 
                       class="hero-image" 
                       loading="lazy"
                       decoding="async"
                       [alt]="(brand ? brand.name : '') + ' ' + modelName"
                       style="width: 100%; height: 100%; object-fit: cover; transition: opacity 0.3s ease-in-out;" />

                  @if (galleryImages.length > 1) {
                    <button type="button" class="gallery-nav-btn prev-btn" (click)="prevImage($event)" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); background: rgba(255, 255, 255, 0.9); color: #0F172A; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 50%; width: 36px; height: 36px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; z-index: 5; backdrop-filter: blur(8px); box-shadow: 0 4px 14px rgba(0,0,0,0.12);">‹</button>
                    <button type="button" class="gallery-nav-btn next-btn" (click)="nextImage($event)" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: rgba(255, 255, 255, 0.9); color: #0F172A; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 50%; width: 36px; height: 36px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; z-index: 5; backdrop-filter: blur(8px); box-shadow: 0 4px 14px rgba(0,0,0,0.12);">›</button>
                  }
                </div>

                @if (galleryImages.length > 1) {
                  <div class="gallery-dots" style="display: flex; justify-content: center; gap: 8px; margin-top: 12px;">
                    @for (img of galleryImages; track $index; let idx = $index) {
                      <span 
                        (click)="selectImage(idx)" 
                        style="width: 8px; height: 8px; border-radius: 50%; cursor: pointer; transition: all 0.25s ease;"
                        [style.background]="activeImageIndex === idx ? '#0284C7' : '#CBD5E1'"
                        [style.transform]="activeImageIndex === idx ? 'scale(1.3)' : 'scale(1)'"
                      ></span>
                    }
                  </div>
                }
              </div>
            </div>

            <div class="hero-bottom-row">
              <div class="variant-selector-container animate-fade" style="animation-delay: 0.1s;">
                <div class="variant-options">
                  @for (variant of siblingVariants; track variant.id) {
                    <label class="variant-radio" [class.selected]="selectedVariantId === variant.id">
                      <input type="radio" 
                             [value]="variant.id" 
                             [checked]="selectedVariantId === variant.id"
                             (change)="selectVariant(variant.id!)">
                      <div class="variant-info">
                        <span class="variant-name">{{ variant.variantName || 'Base' }}</span>
                        <span class="variant-price">{{ variant.price }}</span>
                      </div>
                    </label>
                  }
                </div>
              </div>
              
              <div class="action-buttons">
                <button class="secondary-action-btn" (click)="addToCompare()">+ Add to Compare</button>
              </div>
            </div>
          </div>
          
          @if (selectedVariant) {
            <div class="specs-grid animate-fade" style="animation-delay: 0.2s;">
              
              <!-- Master Specs Sections (Matching Admin 6-Section Layout) -->
              <div class="spec-section">
                <!-- Section 2: Performance & Motor -->
                <div class="accordion-item" [class.expanded]="performanceExpanded">
                  <div class="spec-row accordion-header" (click)="performanceExpanded = !performanceExpanded">
                    <span class="spec-label">🏎️ Performance & Motor</span>
                    <span class="accordion-icon">{{ performanceExpanded ? '▲' : '▼' }}</span>
                  </div>
                  <div class="accordion-content">
                    <div class="spec-row sub-row">
                      <span class="spec-label">Acceleration (0-100 km/h)</span>
                      <span class="spec-value">{{ selectedVariant.acceleration || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Max Power</span>
                      <span class="spec-value">{{ selectedVariant.maxPower || selectedVariant.bhpTorque || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Peak Torque</span>
                      <span class="spec-value">{{ selectedVariant.torque || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Drivetrain Type</span>
                      <span class="spec-value">{{ selectedVariant.drivetrain || '-' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Section 3: Battery & Charging -->
                <div class="accordion-item" [class.expanded]="chargingExpanded">
                  <div class="spec-row accordion-header" (click)="chargingExpanded = !chargingExpanded">
                    <span class="spec-label">🔋 Battery & Charging</span>
                    <span class="accordion-icon">{{ chargingExpanded ? '▲' : '▼' }}</span>
                  </div>
                  <div class="accordion-content">
                    <div class="spec-row sub-row">
                      <span class="spec-label">Battery Capacity</span>
                      <span class="spec-value">{{ selectedVariant.batteryCapacity || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Claimed Range</span>
                      <span class="spec-value">{{ selectedVariant.range || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">AC Charging Speed</span>
                      <span class="spec-value">{{ selectedVariant.acCharging || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">DC Fast Charging Speed</span>
                      <span class="spec-value">{{ selectedVariant.dcCharging || '-' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Section 4: Safety & ADAS -->
                <div class="accordion-item" [class.expanded]="safetyExpanded">
                  <div class="spec-row accordion-header" (click)="safetyExpanded = !safetyExpanded">
                    <span class="spec-label">🛡️ Safety & ADAS</span>
                    <span class="accordion-icon">{{ safetyExpanded ? '▲' : '▼' }}</span>
                  </div>
                  <div class="accordion-content">
                    <div class="spec-row sub-row">
                      <span class="spec-label">NCAP Safety Rating</span>
                      <span class="spec-value">{{ selectedVariant.safetyRating || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">ADAS Level</span>
                      <span class="spec-value">{{ selectedVariant.adasLevel || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Number of Airbags</span>
                      <span class="spec-value">{{ selectedVariant.airbags || '-' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Section 5: Dimensions & Weight -->
                <div class="accordion-item" [class.expanded]="dimensionsExpanded">
                  <div class="spec-row accordion-header" (click)="dimensionsExpanded = !dimensionsExpanded">
                    <span class="spec-label">📐 Dimensions & Weight</span>
                    <span class="accordion-icon">{{ dimensionsExpanded ? '▲' : '▼' }}</span>
                  </div>
                  <div class="accordion-content">
                    <div class="spec-row sub-row">
                      <span class="spec-label">Body Style</span>
                      <span class="spec-value">{{ selectedVariant.bodyStyle || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Dimensions (L x W x H)</span>
                      <span class="spec-value">{{ selectedVariant.dimensions || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Wheelbase</span>
                      <span class="spec-value">{{ selectedVariant.wheelbase || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Ground Clearance</span>
                      <span class="spec-value">{{ selectedVariant.groundClearance || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Boot / Frunk Space</span>
                      <span class="spec-value">{{ selectedVariant.bootFrunkSpace || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Kerb Weight</span>
                      <span class="spec-value">{{ selectedVariant.kerbWeight || selectedVariant.weight || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Gross Weight</span>
                      <span class="spec-value">{{ selectedVariant.grossWeight || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Tyre Size</span>
                      <span class="spec-value">{{ selectedVariant.tyreSize || '-' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Section 6: Entertainment & Interior -->
                <div class="accordion-item" [class.expanded]="entertainmentExpanded">
                  <div class="spec-row accordion-header" (click)="entertainmentExpanded = !entertainmentExpanded">
                    <span class="spec-label">🎵 Entertainment & Interior</span>
                    <span class="accordion-icon">{{ entertainmentExpanded ? '▲' : '▼' }}</span>
                  </div>
                  <div class="accordion-content">
                    <div class="spec-row sub-row">
                      <span class="spec-label">Seating Capacity</span>
                      <span class="spec-value">{{ selectedVariant.seating || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Colour Options</span>
                      <span class="spec-value">{{ selectedVariant.colour || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Screen Display</span>
                      <span class="spec-value">{{ selectedVariant.screen || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Audio System</span>
                      <span class="spec-value">{{ selectedVariant.audio || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Connectivity</span>
                      <span class="spec-value">{{ selectedVariant.connectivity || '-' }}</span>
                    </div>
                    <div class="spec-row sub-row">
                      <span class="spec-label">Key Highlights / Feature Upgrades</span>
                      <span class="spec-value">{{ selectedVariant.keyHighlights || '-' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          }
          
        </div>
      }
    </div>
  `,
  styles: [`
    .vehicle-page {
      background: #fafafa;
      color: #1e293b;
      padding: 120px 24px 100px 24px;
      min-height: 95vh;
      position: relative;
      overflow: hidden;
    }
    
    .page-content {
      max-width: 1000px;
      margin: 0 auto;
    }
    
    /* Hero Section */
    .hero-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin: 10px 0 24px 0;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(0,0,0,0.05);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.02);
    }
    @media (min-width: 768px) {
      .hero-top-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 40px;
      }
      .hero-bottom-row {
        width: 100%;
      }
      .hero-text {
        flex: 1;
      }
      .hero-visual {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    }
    
    .brand-tag {
      display: inline-block;
      font-size: 0.8rem;
      font-weight: 700;
      color: #0284C7;
      background: rgba(2, 132, 199, 0.08);
      padding: 4px 12px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    
    h1 {
      font-size: 2.2rem;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.15;
      margin: 0 0 8px 0;
      letter-spacing: -0.03em;
    }
    @media (max-width: 768px) {
      h1 {
        font-size: 1.8rem;
      }
    }
    
    .overview-highlights {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }
    .highlight-item {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid rgba(0, 0, 0, 0.04);
      box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;
    }
    .highlight-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.07);
    }
    .icon {
      font-size: 1.1rem;
      background: #F8FAFC;
      width: 34px; height: 34px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 10px;
      flex-shrink: 0;
    }
    .highlight-text {
      display: flex;
      flex-direction: column;
    }
    .highlight-text strong {
      font-size: 0.88rem;
      color: #0F172A;
      font-weight: 700;
      line-height: 1.25;
      word-break: break-word;
    }
    .highlight-text span {
      font-size: 0.62rem;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 700;
    }
    
    @media (min-width: 768px) {
      .overview-highlights {
        gap: 10px;
      }
      .highlight-item {
        padding: 10px;
        gap: 10px;
        border-radius: 12px;
      }
      .icon {
        font-size: 1.3rem;
        width: 38px; height: 38px;
        border-radius: 10px;
      }
      .highlight-text strong {
        font-size: 0.95rem;
      }
      .highlight-text span {
        font-size: 0.7rem;
      }
    }
    
    .action-buttons {
      display: flex;
      gap: 16px;
      margin-top: 16px;
    }
    .primary-action-btn {
      background: #10B981;
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2);
    }
    .primary-action-btn:hover {
      background: #059669;
      transform: translateY(-2px);
    }
    .secondary-action-btn {
      background: #0284C7;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 15px rgba(2, 132, 199, 0.2);
    }
    .secondary-action-btn:hover {
      background: #0369A1;
      transform: translateY(-2px);
    }
    
    .hero-image {
      width: 100%;
      height: 100%;
      max-height: 320px;
      object-fit: contain;
      filter: drop-shadow(0 20px 30px rgba(0,0,0,0.15));
    }
    
    .variant-selector-container {
      margin-bottom: 0px;
    }
    
    .variant-selector-container h3 {
      margin: 0 0 12px 0;
      font-size: 1rem;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
    }
    
    .variant-options {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    
    .variant-radio {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      border: 1px solid rgba(0, 0, 0, 0.05);
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      width: auto;
      flex: 0 1 auto;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.03);
    }
    
    .variant-radio:hover {
      border-color: rgba(2, 132, 199, 0.3);
      background: white;
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(2, 132, 199, 0.08);
    }
    
    .variant-radio.selected {
      border-color: #0284C7;
      background: #F0F9FF;
      box-shadow: 0 6px 18px rgba(2, 132, 199, 0.15);
    }
    
    .variant-radio input[type="radio"] {
      display: none;
    }
    
    .variant-info {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
    }
    
    .variant-info .variant-name {
      font-weight: 700;
      color: #0F172A;
      font-size: 0.85rem;
    }
    
    .variant-info .variant-price {
      font-size: 0.72rem;
      color: #0284C7;
      font-weight: 700;
      background: rgba(2, 132, 199, 0.08);
      padding: 2px 6px;
      border-radius: 10px;
    }
    
    .specs-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 900px;
      margin: 0 auto;
    }
    
    .spec-section {
      background: transparent;
      border-radius: 0;
      padding: 0;
      box-shadow: none;
      border: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .accordion-item {
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.07);
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.2s ease;
      box-shadow: 0 2px 10px rgba(0,0,0,0.02);
    }
    .accordion-item:hover {
      border-color: rgba(2, 132, 199, 0.3);
      box-shadow: 0 4px 16px rgba(2, 132, 199, 0.06);
      transform: translateY(-1px);
    }
    .accordion-item.expanded {
      background: white;
      border-color: #0284C7;
      box-shadow: 0 6px 20px rgba(2, 132, 199, 0.08);
    }
    
    .accordion-header {
      cursor: pointer;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
      transition: background 0.2s ease;
    }
    .accordion-header:hover {
      background: rgba(2, 132, 199, 0.02);
    }
    .accordion-header .spec-label {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0F172A;
      letter-spacing: -0.01em;
    }
    
    .accordion-icon {
      font-size: 0.7rem;
      color: #0284C7;
      font-weight: 800;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(2, 132, 199, 0.08);
      border-radius: 50%;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .accordion-item.expanded .accordion-icon {
      transform: rotate(180deg);
      background: #0284C7;
      color: white;
    }
    
    .accordion-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.4s cubic-bezier(0, 1, 0, 1);
      background: white;
    }
    .accordion-item.expanded .accordion-content {
      max-height: 800px;
      transition: max-height 0.4s ease-in-out;
      border-top: 1px solid #F1F5F9;
      padding: 12px 16px;
    }
    
    .spec-row.sub-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #F1F5F9;
    }
    .spec-row.sub-row:last-child {
      border-bottom: none;
    }
    
    .spec-label {
      color: #475569;
      font-weight: 600;
      font-size: 0.95rem;
    }
    
    .spec-value {
      color: #0F172A;
      font-weight: 700;
      font-size: 0.95rem;
      text-align: right;
      max-width: 60%;
    } 
    
    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
    }
    .spinner {
      border: 3px solid rgba(2, 132, 199, 0.1);
      width: 40px; height: 40px;
      border-radius: 50%;
      border-left-color: #0284C7;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    
    .animate-fade {
      animation: fadeIn 0.4s ease-out forwards;
      opacity: 0;
    }
    .animate-premium-fade {
      animation: premiumFade 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes premiumFade {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class VehicleDetailComponent implements OnInit, OnDestroy {
  private sub = new Subscription();
  private dataSub: Subscription | null = null;
  private currentBrandSlug: string | null = null;
  private currentModelSlug: string | null = null;
  loading = true;
  error = false;
  /** Distinguishes a confirmed-missing vehicle from a network/backend failure so the message and retry action are accurate (Task 12). */
  errorKind: 'notFound' | 'network' = 'notFound';
  safetyExpanded = false;
  entertainmentExpanded = false;
  chargingExpanded = false;
  weightExpanded = false;
  performanceExpanded = false;
  dimensionsExpanded = false;
  
  brand: Category | null = null;
  modelName: string = '';
  modelImageUrl: string = '';
  galleryImages: string[] = [];
  activeImageIndex = 0;

  getOptimizedUrl(url: string | undefined | null, width?: number, modelName?: string): string {
    return getOptimizedImageUrl(url, width, modelName || this.modelName);
  }

  get activeImageUrl(): string {
    if (this.galleryImages.length > 0 && this.galleryImages[this.activeImageIndex]) {
      return this.galleryImages[this.activeImageIndex];
    }
    return this.modelImageUrl || '';
  }

  selectImage(index: number) {
    if (index >= 0 && index < this.galleryImages.length) {
      this.activeImageIndex = index;
      this.cdr.detectChanges();
    }
  }

  nextImage(event?: Event) {
    if (event) event.stopPropagation();
    if (this.galleryImages.length > 0) {
      this.activeImageIndex = (this.activeImageIndex + 1) % this.galleryImages.length;
      this.cdr.detectChanges();
    }
  }

  prevImage(event?: Event) {
    if (event) event.stopPropagation();
    if (this.galleryImages.length > 0) {
      this.activeImageIndex = (this.activeImageIndex - 1 + this.galleryImages.length) % this.galleryImages.length;
      this.cdr.detectChanges();
    }
  }
  siblingVariants: CarSpec[] = []; // All variants of the same model
  
  overview: OverviewData = {
    priceRange: '',
    batteryOptions: '',
    claimedRange: '',
    charging: ''
  };
  
  selectedVariantId: string | null = null;
  selectedVariant: CarSpec | null = null;

  constructor(
    private route: ActivatedRoute,
    private compareState: CompareStateService,
    private seoService: SeoService,
    private schemaService: SchemaService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private blogData: BlogDataService,
    private router: Router
  ) {}

  ngOnInit() {
    this.sub.add(
      this.route.paramMap.subscribe(params => {
        const brandSlug = params.get('brandSlug');
        const modelSlug = params.get('modelSlug');
        
        if (brandSlug && modelSlug) {
          this.loadModelData(brandSlug, modelSlug);
        } else {
          this.handleError('notFound');
        }
      })
    );
  }

  onImgError(event: Event, modelName?: string): void {
    handleImageError(event, modelName || this.modelName);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.dataSub?.unsubscribe();
  }

  private handleError(kind: 'notFound' | 'network') {
    this.errorKind = kind;
    this.error = true;
    this.loading = false;
    this.cdr.detectChanges();
  }

  retryLoad() {
    if (this.currentBrandSlug && this.currentModelSlug) {
      // The underlying BlogDataService caches are BehaviorSubjects that
      // terminate permanently on a network error, so a bare re-subscribe
      // would just replay the same stale failure. Clearing forces a fresh
      // network attempt, which is what a "Try Again" button must do.
      this.blogData.clearAllCaches();
      this.loadModelData(this.currentBrandSlug, this.currentModelSlug);
    }
  }
  
  slugify(text: string): string {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  private loadModelData(brandSlug: string, modelSlug: string) {
    this.currentBrandSlug = brandSlug;
    this.currentModelSlug = modelSlug;
    this.loading = true;
    this.error = false;

    // Dedicated subscription (rather than added to `this.sub`) so a manual
    // retry cleanly replaces the previous attempt instead of accumulating a
    // new listener on every click.
    this.dataSub?.unsubscribe();

    // AsyncState-driven: each source resolves to an explicit loading /
    // success / empty / error / timeout / offline status instead of a plain
    // array, so "network confirmed this is empty" is known immediately
    // rather than guessed at via a timeout. This is the root-cause fix that
    // replaced the old 20s safety timer entirely.
    this.dataSub =
      combineLatest({
        categories: this.blogData.getCategoriesState(),
        allVehicles: this.blogData.getVehiclesState()
      }).subscribe(({ categories, allVehicles }) => {
        // Still waiting on one or both sources to resolve for the first time.
        if (categories.status === 'loading' || allVehicles.status === 'loading') return;

        // Either source confirmed a failure - show a network error state
        // with a retry action instead of waiting forever or misreporting it
        // as "Vehicle Not Found".
        if (categories.status !== 'success' && categories.status !== 'empty') {
          this.handleError('network');
          return;
        }
        if (allVehicles.status !== 'success' && allVehicles.status !== 'empty') {
          this.handleError('network');
          return;
        }

        const categoriesData = categories.status === 'success' ? categories.data : [];
        const vehiclesData = allVehicles.status === 'success' ? allVehicles.data : [];

        this.brand = categoriesData.find(c => this.slugify(c.name) === brandSlug) || null;
        if (!this.brand) {
          this.handleError('notFound');
          return;
        }
        
        // Filter out the sibling variants belonging to this model
        const modelVariants = vehiclesData.filter(v => 
          v.categoryId === this.brand!.id && 
          this.slugify(v.parentModel || v.name) === modelSlug
        );
        
        if (modelVariants.length === 0) {
          this.handleError('notFound');
          return;
        }

        const validSpecs = modelVariants.filter(s => s && s.id);
        if (validSpecs.length === 0) {
          this.handleError('notFound');
          return;
        }
        
        this.siblingVariants = validSpecs;
            
            // Grab gallery or single image from first variant that has one
            const variantWithGallery = validSpecs.find(s => s.galleryImages && s.galleryImages.length > 0);
            if (variantWithGallery && variantWithGallery.galleryImages) {
              this.galleryImages = variantWithGallery.galleryImages;
              this.modelImageUrl = this.galleryImages[0] || '';
            } else {
              const variantWithImage = validSpecs.find(s => s.imageUrl && s.imageUrl.trim() !== '');
              this.modelImageUrl = variantWithImage ? variantWithImage.imageUrl! : '';
              this.galleryImages = this.modelImageUrl ? [this.modelImageUrl] : [];
            }
            this.activeImageIndex = 0;
            
            this.modelName = validSpecs[0].parentModel || validSpecs[0].name;
            
            this.selectedVariantId = this.siblingVariants[0].id!;
            this.selectedVariant = this.siblingVariants[0];
            
            this.calculateOverview(validSpecs);
            this.updateSEO();
            
            this.error = false;
            this.loading = false;
            this.cdr.detectChanges();
      });
  }

  private calculateOverview(variants: CarSpec[]) {
    // Sort by extracted price
    const sortedByPrice = [...variants].sort((a, b) => {
      const pA = parseFloat(a.price.replace(/[^0-9.]/g, '')) || 0;
      const pB = parseFloat(b.price.replace(/[^0-9.]/g, '')) || 0;
      return pA - pB;
    });
    
    // 1. Price Range
    if (sortedByPrice.length > 1 && sortedByPrice[0].price !== sortedByPrice[sortedByPrice.length-1].price) {
      this.overview.priceRange = `₹${sortedByPrice[0].price.replace('₹', '').trim()} – ₹${sortedByPrice[sortedByPrice.length-1].price.replace('₹', '').trim()}`;
    } else if (sortedByPrice.length > 0) {
      this.overview.priceRange = `₹${sortedByPrice[0].price.replace('₹', '').trim()}`;
    } else {
      this.overview.priceRange = 'TBA';
    }

    // 2. Battery Options
    const batteries = new Set<number>();
    variants.forEach(v => {
      if (v.batteryCapacity && v.batteryCapacity !== 'N/A' && v.batteryCapacity !== '-') {
        const num = parseFloat(v.batteryCapacity.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) batteries.add(num);
      }
    });
    const sortedBats = Array.from(batteries).sort((a, b) => a - b);
    this.overview.batteryOptions = sortedBats.length > 0 ? sortedBats.map(b => `${b} kWh`).join(' • ') : 'N/A';

    // 3. Claimed Range
    let minRange = Infinity;
    let maxRange = 0;
    variants.forEach(v => {
      if (v.range && v.range !== 'N/A' && v.range !== '-') {
        const numStr = v.range.replace(/[^0-9.]/g, '');
        const num = parseFloat(numStr);
        if (!isNaN(num)) {
          if (num < minRange) minRange = num;
          if (num > maxRange) maxRange = num;
        }
      }
    });
    
    if (minRange !== Infinity && minRange !== maxRange) {
      this.overview.claimedRange = `${minRange}–${maxRange} km`;
    } else if (minRange !== Infinity) {
      this.overview.claimedRange = `${minRange} km`;
    } else {
      this.overview.claimedRange = 'N/A';
    }

    // 4. Charging (Only DC Fast Charging for Overview)
    const dcChargings = new Set<number>();
    variants.forEach(v => {
      if (v.dcCharging && v.dcCharging !== 'N/A' && v.dcCharging !== '-') {
        const num = parseFloat(v.dcCharging.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) dcChargings.add(num);
      }
    });
    const sortedDc = Array.from(dcChargings).sort((a, b) => a - b);
    if (sortedDc.length > 1) {
      this.overview.charging = `${sortedDc[0]} – ${sortedDc[sortedDc.length - 1]} kW DC`;
    } else if (sortedDc.length === 1) {
      this.overview.charging = `${sortedDc[0]} kW DC`;
    } else {
      const rawDcVariant = variants.find(v => v.dcCharging && v.dcCharging !== 'N/A' && v.dcCharging !== '-');
      this.overview.charging = (rawDcVariant && rawDcVariant.dcCharging) ? rawDcVariant.dcCharging : 'N/A';
    }
  }

  updateSEO() {
    if (!this.brand) return;
    
    const title = `${this.brand.name} ${this.modelName} EV: Price, Range & Battery Options | EVCorn`;
    const desc = `Discover the ${this.brand.name} ${this.modelName} electric vehicle. Starting at ${this.overview.priceRange} with battery options of ${this.overview.batteryOptions} and up to ${this.overview.claimedRange} range.`;
    
    this.seoService.updateSeo({title, description: desc});
    
    const productSchema = this.schemaService.buildProduct({
      name: `${this.brand.name} ${this.modelName}`,
      brand: this.brand.name,
      description: desc,
      price: this.overview.priceRange,
      batteryCapacity: this.overview.batteryOptions,
      range: this.overview.claimedRange
    });
    this.schemaService.setSchema([productSchema]);
  }

  selectVariant(id: string) {
    this.selectedVariantId = id;
    this.selectedVariant = this.siblingVariants.find(v => v.id === id) || null;
  }

  addToCompare() {
    if (this.selectedVariantId) {
      this.compareState.addVehicle(this.selectedVariantId);
    }
  }
}
