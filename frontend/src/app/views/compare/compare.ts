import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { SchemaService } from '../../services/schema.service';
import { HttpClient } from '@angular/common/http';
import { BlogDataService, CarSpec, Category } from '../../services/blog-data.service';
import { CompareStateService } from '../../services/compare-state.service';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [RouterLink, BreadcrumbComponent],
  template: `
    <div class="compare-page animate-premium-fade">
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

      <div class="compare-header-box animate-fade">
        <app-breadcrumb [paths]="[{label: 'Compare EVs', url: '/compare'}]"></app-breadcrumb>
        <span class="compare-badge">Spec Battle</span>
        <div class="compare-title-row">
          <h1>Compare Electric Vehicles</h1>
          <button (click)="shareCompare()" class="share-btn" title="Share this comparison sheet">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7L15.9 7.33c.53.48 1.22.78 1.98.78 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.52 9.34 6.84 9.05 6 9.05c-1.66 0-3 1.34-3 3s1.34 3 3 3c.84 0 1.52-.29 2.04-.76l7.97 4.65c-.03.22-.05.45-.05.67 0 1.6 1.3 2.9 2.9 2.9s2.9-1.3 2.9-2.9-1.3-2.9-2.9-2.9z"/>
            </svg>
            <span>Share Sheet</span>
          </button>
        </div>
        <p class="subtitle">Side-by-side analysis of India's leading EVs. Add up to 4 models to compare prices, batteries, dimensions, and safety ratings.</p>
      </div>

      @if (loading) {
        <div class="loading-overlay">
          <div class="spinner"></div>
          <p>Connecting to database...</p>
          @if (error) {
            <p class="retry-hint">Server is waking up (takes about 30 seconds). Retrying automatically...</p>
          }
        </div>
      } @else {
        <div class="compare-dropdowns">
          @for (sel of activeColumns; track sel) {
            <div class="select-group animate-fade">
              <div class="select-header">
                <span>Vehicle {{ $index + 1 }}</span>
                @if (activeColumns.length > 2) {
                  <button class="remove-col-btn" (click)="removeColumn(sel)" title="Remove this column">✕</button>
                }
              </div>
              
              <!-- 1. Brand Selection -->
              <select [value]="selectedBrandIds[sel] || ''" (change)="onBrandChange(sel, $event)">
                <option value="">Select Brand</option>
                @for (cat of categories; track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
              
              <!-- 2. Model Selection -->
              <select [disabled]="!selectedBrandIds[sel]" [value]="selectedModelNames[sel] || ''" (change)="onModelChange(sel, $event)">
                <option value="">Select Model</option>
                @for (model of getFilteredModelsList(selectedBrandIds[sel]); track model) {
                  <option [value]="model">{{ model }}</option>
                }
              </select>

              <!-- 3. Variant Selection -->
              <select [disabled]="!selectedModelNames[sel]" [value]="selectedCarIds[sel] || ''" (change)="onCarChange(sel, $event)">
                <option value="">Select Variant</option>
                @for (car of getFilteredVariants(selectedBrandIds[sel], selectedModelNames[sel]); track car.id) {
                  <option [value]="car.id">{{ car.variantName || car.name }}</option>
                }
              </select>
            </div>
          }
          
          @if (activeColumns.length < 4) {
            <button class="add-col-card" (click)="addColumn()">
              <span class="plus-icon">+</span>
              <span>Add EV Model</span>
            </button>
          }
        </div>
      }

      <div class="table-container animate-fade">
        <table>
          <thead>
            <tr>
              <th class="spec-label-header">Key Specifications</th>
              @for (sel of activeColumns; track sel) {
                <th class="car-header-cell"
                  [class.hovered-column]="hoveredCol === sel"
                  (mouseenter)="hoveredCol = sel"
                  (mouseleave)="hoveredCol = null"
                >
                  @if (selectedCarIds[sel]) {
                    <div class="active-car-card">
                      <span class="active-car-brand-tag" 
                        [style.border-color]="getBrandColor(getCarBrand(sel))" 
                        [style.color]="getBrandColor(getCarBrand(sel))"
                        [style.background]="getBrandBg(getCarBrand(sel))"
                      >
                        {{ getCarBrand(sel) }}
                      </span>
                      <span class="active-car-name">{{ getCleanCarName(sel) }}</span>
                      @if (getCarModelYear(sel)) {
                        <span class="active-car-year">{{ getCarModelYear(sel) }}</span>
                      }
                    </div>
                  } @else {
                    <div class="empty-car-placeholder" (click)="focusSelect($index)">
                      <svg viewBox="0 0 100 35" class="car-silhouette">
                        <path d="M15,22 Q20,13 30,10 L65,8 Q78,8 82,15 L90,17 Q95,18 95,22 L92,24 L88,24 Q87,20 83,20 Q79,20 78,24 L32,24 Q31,20 27,20 Q23,20 22,24 L8,24 Q6,22 15,22 Z" />
                        <circle cx="27" cy="24" r="3.5" />
                        <circle cx="83" cy="24" r="3.5" />
                      </svg>
                      <span class="placeholder-label">+ Choose EV</span>
                    </div>
                  }
                </th>
              }
            </tr>
          </thead>
          <tbody>
            <!-- 1. Price -->
            <tr>
              <td class="spec-label">Price (Ex-Showroom)</td>
              @for (sel of activeColumns; track sel) {
                <td [class.empty-cell]="!selectedCarIds[sel]" 
                  class="price-cell"
                  [class.hovered-column]="hoveredCol === sel"
                  (mouseenter)="hoveredCol = sel"
                  (mouseleave)="hoveredCol = null"
                >
                  {{ getCarStat(sel, 'price') }}
                </td>
              }
            </tr>
            <!-- 2. Range -->
            <tr>
              <td class="spec-label">Claimed Range</td>
              @for (sel of activeColumns; track sel) {
                <td [class.empty-cell]="!selectedCarIds[sel]"
                  [class.hovered-column]="hoveredCol === sel"
                  (mouseenter)="hoveredCol = sel"
                  (mouseleave)="hoveredCol = null"
                >
                  @if (selectedCarIds[sel]) {
                    <span class="range-text">🛣️ {{ getCarStat(sel, 'range') || 'N/A' }}</span>
                  } @else {
                    -
                  }
                </td>
              }
            </tr>
            <!-- 3. Battery -->
            <tr>
              <td class="spec-label">Battery Capacity</td>
              @for (sel of activeColumns; track sel) {
                <td [class.empty-cell]="!selectedCarIds[sel]"
                  [class.hovered-column]="hoveredCol === sel"
                  (mouseenter)="hoveredCol = sel"
                  (mouseleave)="hoveredCol = null"
                >
                  @if (selectedCarIds[sel]) {
                    <span class="battery-text">⚡ {{ getCarStat(sel, 'batteryCapacity') }}</span>
                  } @else {
                    -
                  }
                </td>
              }
            </tr>
            <!-- 4. DC Fast Charging -->
            <tr>
              <td class="spec-label">DC Fast Charging Speed / Time</td>
              @for (sel of activeColumns; track sel) {
                <td [class.empty-cell]="!selectedCarIds[sel]"
                  [class.hovered-column]="hoveredCol === sel"
                  (mouseenter)="hoveredCol = sel"
                  (mouseleave)="hoveredCol = null"
                >
                  @if (selectedCarIds[sel]) {
                    <span>⚡ {{ getCarStat(sel, 'dcCharging') || 'N/A' }}</span>
                  } @else {
                    -
                  }
                </td>
              }
            </tr>
            <!-- 5. AC Charging -->
            <tr>
              <td class="spec-label">AC Charging Speed / Time</td>
              @for (sel of activeColumns; track sel) {
                <td [class.empty-cell]="!selectedCarIds[sel]"
                  [class.hovered-column]="hoveredCol === sel"
                  (mouseenter)="hoveredCol = sel"
                  (mouseleave)="hoveredCol = null"
                >
                  @if (selectedCarIds[sel]) {
                    <span>🔌 {{ getCarStat(sel, 'acCharging') || 'N/A' }}</span>
                  } @else {
                    -
                  }
                </td>
              }
            </tr>
            <!-- 6. Safety Rating -->
            <tr>
              <td class="spec-label">Safety Rating</td>
              @for (sel of activeColumns; track sel) {
                <td [class.empty-cell]="!selectedCarIds[sel]"
                  [class.hovered-column]="hoveredCol === sel"
                  (mouseenter)="hoveredCol = sel"
                  (mouseleave)="hoveredCol = null"
                >
                  @if (selectedCarIds[sel]) {
                    @if (getCarStat(sel, 'safetyRating').includes('Star')) {
                      <div class="safety-stars">
                        <span class="star-icon">★</span>
                        <strong>{{ getCarStat(sel, 'safetyRating') }}</strong>
                      </div>
                    } @else {
                      <strong>{{ getCarStat(sel, 'safetyRating') }}</strong>
                    }
                  } @else {
                    -
                  }
                </td>
              }
            </tr>
            <!-- 7. Ground Clearance -->
            <tr>
              <td class="spec-label">Ground Clearance</td>
              @for (sel of activeColumns; track sel) {
                <td [class.empty-cell]="!selectedCarIds[sel]"
                  [class.hovered-column]="hoveredCol === sel"
                  (mouseenter)="hoveredCol = sel"
                  (mouseleave)="hoveredCol = null"
                >{{ getCarStat(sel, 'groundClearance') }}</td>
              }
            </tr>
            <!-- 8. Seating -->
            <tr>
              <td class="spec-label">Seating Capacity</td>
              @for (sel of activeColumns; track sel) {
                <td [class.empty-cell]="!selectedCarIds[sel]"
                  [class.hovered-column]="hoveredCol === sel"
                  (mouseenter)="hoveredCol = sel"
                  (mouseleave)="hoveredCol = null"
                >{{ getCarStat(sel, 'seating') }}</td>
              }
            </tr>
            <!-- 9. BHP / Torque -->
            <tr>
              <td class="spec-label">BHP / Torque</td>
              @for (sel of activeColumns; track sel) {
                <td [class.empty-cell]="!selectedCarIds[sel]"
                  [class.hovered-column]="hoveredCol === sel"
                  (mouseenter)="hoveredCol = sel"
                  (mouseleave)="hoveredCol = null"
                >{{ getCarStat(sel, 'bhpTorque') }}</td>
              }
            </tr>
            <!-- 10. Boot / Frunk -->
            <tr>
              <td class="spec-label">Boot / Frunk Space</td>
              @for (sel of activeColumns; track sel) {
                <td [class.empty-cell]="!selectedCarIds[sel]"
                  [class.hovered-column]="hoveredCol === sel"
                  (mouseenter)="hoveredCol = sel"
                  (mouseleave)="hoveredCol = null"
                >{{ getCarStat(sel, 'bootFrunkSpace') }}</td>
              }
            </tr>
            <!-- 11. Drivetrain -->
            <tr>
              <td class="spec-label">Drivetrain Type</td>
              @for (sel of activeColumns; track sel) {
                <td [class.empty-cell]="!selectedCarIds[sel]"
                  [class.hovered-column]="hoveredCol === sel"
                  (mouseenter)="hoveredCol = sel"
                  (mouseleave)="hoveredCol = null"
                >{{ getCarStat(sel, 'drivetrain') }}</td>
              }
            </tr>
            <!-- 12. Dimensions -->
            <tr>
              <td class="spec-label">Dimensions (L x W x H)</td>
              @for (sel of activeColumns; track sel) {
                <td [class.empty-cell]="!selectedCarIds[sel]" 
                  class="dim-cell"
                  [class.hovered-column]="hoveredCol === sel"
                  (mouseenter)="hoveredCol = sel"
                  (mouseleave)="hoveredCol = null"
                >{{ getCarStat(sel, 'dimensions') }}</td>
              }
            </tr>
            <!-- 13. Tyre Size -->
            <tr>
              <td class="spec-label">Tyre Size</td>
              @for (sel of activeColumns; track sel) {
                <td [class.empty-cell]="!selectedCarIds[sel]"
                  [class.hovered-column]="hoveredCol === sel"
                  (mouseenter)="hoveredCol = sel"
                  (mouseleave)="hoveredCol = null"
                >
                  {{ getCarStat(sel, 'tyreSize') }}
                </td>
              }
            </tr>
            <!-- 14. Key Highlights -->
            <tr>
              <td class="spec-label">Key Highlights / Feature Upgrades</td>
              @for (sel of activeColumns; track sel) {
                <td [class.empty-cell]="!selectedCarIds[sel]"
                  [class.hovered-column]="hoveredCol === sel"
                  (mouseenter)="hoveredCol = sel"
                  (mouseleave)="hoveredCol = null"
                >
                  {{ getCarStat(sel, 'keyHighlights') }}
                </td>
              }
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Related Content -->
      <section class="related-content-section animate-fade" style="margin-top: 60px; padding-top: 40px; border-top: 1px solid rgba(0,0,0,0.05);">
        <h2 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 20px;">Explore More EV Tools</h2>
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
          <a routerLink="/charging" class="related-link-card" style="flex: 1; min-width: 280px; padding: 24px; background: white; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); text-decoration: none; color: inherit; display: block;">
            <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; color: #0284C7;">Calculate EV Charging Time</h3>
            <p style="font-size: 0.9rem; color: #64748B;">Simulate charging speeds across different battery sizes and chargers.</p>
          </a>
          <a routerLink="/articles" class="related-link-card" style="flex: 1; min-width: 280px; padding: 24px; background: white; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); text-decoration: none; color: inherit; display: block;">
            <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; color: #7952FF;">Read Latest EV Insights</h3>
            <p style="font-size: 0.9rem; color: #64748B;">Stay updated with in-depth reviews and comparisons in our articles hub.</p>
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

    .compare-page {
      background: #fafafa;
      color: #1e293b;
      padding: 120px 24px 80px 24px;
      min-height: 95vh;
      font-family: inherit;
      position: relative;
      overflow: hidden;
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
      opacity: 0.08; /* Watery colors visible on white */
      z-index: -1;
      pointer-events: none;
      animation: floatBlobs 20s infinite alternate ease-in-out;
    }

    .compare-badge {
      display: inline-block;
      padding: 4px 14px;
      background: linear-gradient(135deg, rgba(0, 210, 255, 0.08) 0%, rgba(255, 0, 127, 0.08) 100%);
      border: 1px solid rgba(121, 82, 255, 0.2);
      border-radius: 30px;
      color: #7952FF;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
      box-shadow: 0 4px 15px rgba(121, 82, 255, 0.05);
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
      0% {
        transform: translate(0, 0) scale(1);
      }
      50% {
        transform: translate(60px, -40px) scale(1.1);
      }
      100% {
        transform: translate(-40px, 50px) scale(0.9);
      }
    }
    .compare-header-box {
      text-align: center;
      max-width: 700px;
      margin: 0 auto 40px auto;
    }
    .compare-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      gap: 15px;
      flex-wrap: wrap;
    }
    .share-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 1px solid rgba(2, 132, 199, 0.2);
      color: #0284C7;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .share-btn:hover {
      background: rgba(2, 132, 199, 0.05);
      border-color: #0284C7;
      transform: translateY(-1px);
    }
    .share-btn:active {
      transform: translateY(0);
    }
    h1 {
      font-size: 2.2rem;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.03em;
      margin-bottom: 8px;
    }
    h2 {
      font-size: 1.8rem;
      font-weight: 800;
      color: #0F172A;
    }
    .subtitle {
      font-size: 0.95rem;
      color: #64748B;
      line-height: 1.5;
    }
    .compare-dropdowns {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 35px;
      align-items: flex-end;
    }
    .select-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 220px;
      background: white;
      border: 1px solid rgba(0,0,0,0.03);
      padding: 16px;
      border-radius: 16px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.01);
    }
    .select-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: #64748B;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .remove-col-btn {
      background: transparent;
      border: none;
      color: #94A3B8;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s ease;
      padding: 0 4px;
    }
    .remove-col-btn:hover {
      color: #EF4444;
      transform: scale(1.1);
    }
    .add-col-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 220px;
      height: 120px;
      border: 1.5px dashed rgba(2, 132, 199, 0.2);
      border-radius: 16px;
      background: rgba(2, 132, 199, 0.01);
      color: #0284C7;
      font-weight: 700;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .add-col-card:hover {
      background: rgba(2, 132, 199, 0.04);
      border-color: #0284C7;
      box-shadow: 0 4px 15px rgba(2, 132, 199, 0.05);
    }
    .plus-icon {
      font-size: 1.4rem;
      margin-bottom: 4px;
    }
    .animate-fade {
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    select {
      padding: 10px 12px;
      width: 100%;
      background: #FFFFFF;
      color: #1E293B;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 10px;
      outline: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    select:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      border-color: rgba(15, 23, 42, 0.04);
      background: #F8FAFC;
    }
    select:focus {
      border-color: #0284C7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.08);
    }
    .table-container {
      max-width: 1100px;
      margin: 0 auto;
      overflow-x: auto;
      background: #FFFFFF;
      border-radius: 20px;
      border: 1px solid rgba(0, 0, 0, 0.04);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: none;
    }
    th, td {
      padding: 18px 24px;
      text-align: center;
      border-bottom: 1px solid #F1F5F9;
      font-size: 0.92rem;
      transition: background-color 0.2s ease;
    }
    th.hovered-column, td.hovered-column {
      background-color: rgba(2, 132, 199, 0.02) !important;
    }
    th {
      background: white;
      vertical-align: middle;
      border-bottom: 2px solid #E2E8F0;
    }
    tr {
      transition: background 0.15s;
    }
    tr:hover {
      background: #FAF8F8;
    }
    .spec-label-header {
      text-align: left;
      font-weight: 800;
      color: #0F172A;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 2px solid #E2E8F0;
      width: 220px;
    }
    .spec-label {
      text-align: left;
      font-weight: 700;
      color: #475569;
      background: white;
      width: 220px;
    }
    .active-car-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 10px 0;
    }
    .active-car-name {
      display: block;
      font-weight: 800;
      color: #0F172A;
      font-size: 1.05rem;
      letter-spacing: -0.02em;
    }
    .active-car-year {
      font-size: 0.7rem;
      font-weight: 700;
      color: #64748B;
      margin-top: 1px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .active-car-brand-tag {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      border: 1.5px solid;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .empty-car-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      opacity: 0.35;
      padding: 15px 0;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .empty-car-placeholder:hover {
      opacity: 0.75;
      transform: translateY(-2px);
    }
    .car-silhouette {
      width: 60px;
      height: 25px;
      fill: none;
      stroke: #475569;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .placeholder-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .empty-cell {
      color: #CBD5E1;
      font-weight: 400;
    }
    .price-cell {
      font-weight: 800;
      color: #0F172A;
      font-size: 1rem;
    }
    .range-badge {
      display: inline-block;
      background: rgba(2, 132, 199, 0.04);
      border: 1px solid rgba(2, 132, 199, 0.12);
      color: #0284C7;
      padding: 4px 12px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .battery-text {
      font-weight: 600;
      color: #0284C7;
    }
    .safety-stars {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .star-icon {
      color: #D97706;
      font-size: 1.1rem;
    }
    .safety-stars strong {
      color: #D97706;
    }
    .dim-cell {
      font-size: 0.85rem;
      color: #475569;
    }
    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      background: #FFFFFF;
      border-radius: 20px;
      max-width: 500px;
      margin: 40px auto;
      border: 1px dashed rgba(2, 132, 199, 0.2);
    }
    .spinner {
      border: 3px solid rgba(2, 132, 199, 0.1);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border-left-color: #0284C7;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .retry-hint {
      font-size: 0.85rem;
      color: #718096;
      margin-top: 10px;
    }
    @media (max-width: 768px) {
      .table-container {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 15px;
      }
      .compare-page {
        padding-top: 100px;
        padding-left: 12px;
        padding-right: 12px;
      }
      .compare-dropdowns {
        flex-wrap: nowrap !important;
        overflow-x: auto;
        justify-content: flex-start !important;
        padding: 10px;
        margin-bottom: 20px;
        -webkit-overflow-scrolling: touch;
        gap: 12px;
      }
      .select-group, .add-col-card {
        width: 180px !important;
        min-width: 180px !important;
        flex-shrink: 0;
        box-sizing: border-box;
      }
      .spec-label, .spec-label-header {
        position: sticky;
        left: 0;
        z-index: 10;
        background: #FFFFFF !important;
        box-shadow: 3px 0 6px rgba(0, 0, 0, 0.05);
      }
      th, td {
        padding: 12px 10px;
        font-size: 0.85rem;
        min-width: 160px;
      }
      th.spec-label-header, td.spec-label {
        min-width: 140px;
        width: 140px;
      }
    }
  `]
})
export class CompareComponent implements OnInit {
  selectedCarIds: (string | null)[] = [null, null, null, null];
  selectedBrandIds: (string | null)[] = [null, null, null, null];
  selectedModelNames: (string | null)[] = [null, null, null, null];
  carList: CarSpec[] = [];
  categories: Category[] = [];
  carsMap: Record<string, CarSpec> = {};
  activeColumns: number[] = [0, 1]; // Shows Car 1 (0) and Car 2 (1) by default
  hoveredCol: number | null = null; // Tracks currently hovered vehicle column
  
  loading = true;
  error = false;

  constructor(
    private dataService: BlogDataService, 
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private seoService: SeoService,
    private schemaService: SchemaService,
    private http: HttpClient,
    private compareState: CompareStateService
  ) {}

  ngOnInit() {
    this.loadData();
    this.route.queryParams.subscribe(params => {
      const brand = params['brand'];
      if (brand) {
        this.selectedBrandIds[0] = brand;
      }

      const carsParam = params['cars'];
      if (carsParam) {
        const carIds = carsParam.split(',');
        carIds.forEach((id: string, index: number) => {
          if (index < 4) {
            this.selectedCarIds[index] = id;
          }
        });

        // Auto-scale visible columns to match preloaded cars list size (min 2, max 4)
        const count = Math.min(Math.max(carIds.length, 2), 4);
        this.activeColumns = Array.from({ length: count }, (_, i) => i);
      } else {
        const trayIds = this.compareState.currentSelectedIds;
        if (trayIds.length > 0) {
          trayIds.forEach((id: string, index: number) => {
            if (index < 4) {
              this.selectedCarIds[index] = id;
            }
          });
          const count = Math.min(Math.max(trayIds.length, 2), 4);
          this.activeColumns = Array.from({ length: count }, (_, i) => i);
        }
      }
    });
  }

  shareCompare() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    const activeIds = this.selectedCarIds.filter(id => !!id);
    const shareUrl = activeIds.length > 0
      ? `https://evcorn.com/compare?cars=${activeIds.join(',')}`
      : `https://evcorn.com/compare`;

    const shareData = {
      title: 'EV Comparison Sheet | EVCorn',
      text: activeIds.length > 0
        ? `Check out this side-by-side electric vehicle comparison sheet on EVCorn!`
        : `Compare price, battery capacity, range and specifications of India's leading EVs on EVCorn.`,
      url: shareUrl
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      navigator.share(shareData)
        .then(() => console.log('Comparison shared successfully'))
        .catch((err) => console.log('Error sharing comparison:', err));
    } else {
      // Fallback: Copy link to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Comparison sheet link copied to clipboard! Share it anywhere.');
      }).catch((err) => {
        console.error('Failed to copy link:', err);
      });
    }
  }

  loadData() {
    // All data loaded from STATIC files on Vercel CDN.
    // Zero backend calls. Zero lag. Specs show instantly.
    this.http.get<any[]>('/data/categories.json').subscribe({
      next: (cats) => {
        this.categories = cats;
        this.http.get<any[]>('/data/vehicles-index.json').subscribe({
          next: (index) => {
            this.carList = index as CarSpec[];

            // Pre-load ALL specs from static file into carsMap — instant lookup
            this.http.get<any[]>('/data/vehicles-specs.json').subscribe({
              next: (specs) => {
                this.carsMap = specs.reduce((acc, car) => {
                  if (car.id) acc[car.id] = car;
                  return acc;
                }, {} as Record<string, CarSpec>);

                this.loading = false;

                // Auto-populate dropdowns for pre-selected cars from shared URL
                this.selectedCarIds.forEach((id, index) => {
                  if (id && this.carsMap[id]) {
                    const car = this.carsMap[id];
                    this.selectedBrandIds[index] = car.categoryId;
                    this.selectedModelNames[index] = (car as any).parentModel || car.name;
                  }
                });

                this.updateSEOMetadata();
                this.cdr.detectChanges();
              },
              error: () => this.scheduleRetry()
            });
          },
          error: () => this.scheduleRetry()
        });
      },
      error: () => this.scheduleRetry()
    });
  }

  // Fetch full specs for a single car only when needed, cache result
  fetchCarDetails(carId: string) {
    if (!carId || this.carsMap[carId]) return; // already cached
    this.dataService.getVehicleById(carId).subscribe({
      next: (car) => {
        if (car && car.id) {
          this.carsMap[car.id] = car;
          this.updateSEOMetadata();
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error(`Failed to load details for car ${carId}:`, err)
    });
  }

  scheduleRetry() {
    this.error = true;
    setTimeout(() => {
      this.loadData();
    }, 3000);
  }

  updateSEOMetadata() {
    const activeNames: string[] = [];
    const productSchemas: any[] = [];

    this.activeColumns.forEach(sel => {
      const carId = this.selectedCarIds[sel];
      if (carId && this.carsMap[carId]) {
        const car = this.carsMap[carId];
        activeNames.push(car.name);
        
        productSchemas.push(
          this.schemaService.buildProduct({
            name: car.name,
            brand: car.categoryId,
            description: `Explore specifications and pricing for the ${car.name}.`,
            price: car.price,
            batteryCapacity: car.batteryCapacity,
            range: car.range
          })
        );
      }
    });

    const schemas: any[] = [
      this.schemaService.buildBreadcrumbs([
        { name: 'Home', url: '' },
        { name: 'Compare', url: '/compare' }
      ])
    ];

    if (activeNames.length > 0) {
      const titleText = `Compare ${activeNames.join(' vs ')}: Price, Specs, Range`;
      const descText = `Detailed side-by-side comparison of ${activeNames.join(' and ')}. Compare price, battery capacity, ground clearance, safety ratings, and performance specs on EVCorn.`;
      
      this.seoService.updateSeo({
        title: titleText,
        description: descText
      });

      // Inject products
      schemas.push(...productSchemas);
    } else {
      this.seoService.updateSeo({
        title: 'Compare Electric Vehicles (EVs) - Specs, Price, Range',
        description: 'Compare electric cars in India side-by-side. Compare battery capacity, certified range, charging speed, dimensions, and prices to select the best EV.' 
      });

      // If no active comparisons, default to CollectionPage
      schemas.push(
        this.schemaService.buildCollectionPage('Compare Electric Vehicles', 'Compare electric car specifications side-by-side.')
      );
    }
    
    this.schemaService.setSchema(schemas);
  }


  onBrandChange(index: number, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedBrandIds[index] = select.value || null;
    this.selectedModelNames[index] = null;
    this.selectedCarIds[index] = null;
    this.syncStateService();
    this.updateSEOMetadata();
    this.cdr.detectChanges();
  }

  onModelChange(index: number, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedModelNames[index] = select.value || null;
    this.selectedCarIds[index] = null;
    this.syncStateService();
    this.updateSEOMetadata();
    this.cdr.detectChanges();
  }

  onCarChange(index: number, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedCarIds[index] = select.value || null;
    // carsMap is already pre-loaded from static file — specs appear instantly
    this.syncStateService();
    this.updateSEOMetadata();
    this.cdr.detectChanges();
  }
  
  private syncStateService() {
    const activeIds = this.selectedCarIds.filter(id => !!id) as string[];
    this.compareState.setVehicles(activeIds);
  }

  getFilteredModelsList(brandId: string | null): string[] {
    if (!brandId) return [];
    const models = this.carList
      .filter(car => car.categoryId === brandId)
      .map(car => {
        let pModel = car.parentModel || car.name;
        let vName = car.variantName || car.name;
        if (pModel === vName) {
          pModel = car.name.split(' ')[0];
        }
        return pModel;
      });
    return Array.from(new Set(models));
  }

  getFilteredVariants(brandId: string | null, modelName: string | null): CarSpec[] {
    if (!brandId || !modelName) return [];
    return this.carList.filter(car => {
      if (car.categoryId !== brandId) return false;
      let pModel = car.parentModel || car.name;
      let vName = car.variantName || car.name;
      if (pModel === vName) {
        pModel = car.name.split(' ')[0];
      }
      return pModel === modelName || (!car.parentModel && car.name === modelName);
    });
  }

  getCarName(index: number): string {
    const id = this.selectedCarIds[index];
    if (!id) return `Car ${index + 1}`;
    return this.carsMap[id]?.name || `Car ${index + 1}`;
  }

  getCleanCarName(index: number): string {
    const name = this.getCarName(index);
    return name.replace(/\s*\(\d{4}\)\s*/g, '').trim();
  }

  getCarModelYear(index: number): string {
    const name = this.getCarName(index);
    const match = name.match(/\((\d{4})\)/);
    return match ? `${match[1]} Edition` : '';
  }

  getCarBrand(index: number): string {
    const carId = this.selectedCarIds[index];
    if (!carId) return '';
    const car = this.carsMap[carId];
    if (!car) return '';
    const cat = this.categories.find(c => c.id === car.categoryId);
    return cat ? cat.name : '';
  }

  getBrandColor(brandName: string): string {
    if (!brandName) return '#64748B';
    const name = brandName.toLowerCase();
    if (name.includes('tata')) return '#EA580C'; // Solar Orange
    if (name.includes('mg')) return '#EF4444'; // Red
    if (name.includes('byd')) return '#0284C7'; // Blue
    if (name.includes('citroen')) return '#0F766E'; // Teal
    if (name.includes('hyundai')) return '#4F46E5'; // Indigo
    return '#64748B';
  }

  getBrandBg(brandName: string): string {
    if (!brandName) return 'rgba(100, 116, 139, 0.05)';
    const name = brandName.toLowerCase();
    if (name.includes('tata')) return 'rgba(234, 88, 12, 0.04)';
    if (name.includes('mg')) return 'rgba(239, 68, 68, 0.04)';
    if (name.includes('byd')) return 'rgba(2, 132, 199, 0.04)';
    if (name.includes('citroen')) return 'rgba(15, 118, 110, 0.04)';
    if (name.includes('hyundai')) return 'rgba(79, 70, 229, 0.04)';
    return 'rgba(100, 116, 139, 0.05)';
  }

  getCarStat(index: number, statKey: keyof CarSpec): string {
    const id = this.selectedCarIds[index];
    if (!id) return '-';
    const val = this.carsMap[id]?.[statKey];
    return val !== undefined ? String(val) : '-';
  }

  focusSelect(index: number) {
    const selectElements = document.querySelectorAll('.compare-dropdowns select');
    if (selectElements && selectElements.length > index * 3) {
      (selectElements[index * 3] as HTMLSelectElement).focus();
    }
  }

  addColumn() {
    if (this.activeColumns.length < 4) {
      for (let i = 0; i < 4; i++) {
        if (!this.activeColumns.includes(i)) {
          this.activeColumns.push(i);
          this.activeColumns.sort((a, b) => a - b);
          break;
        }
      }
      this.cdr.detectChanges();
    }
  }

  removeColumn(index: number) {
    if (this.activeColumns.length > 2) {
      this.selectedBrandIds[index] = null;
      this.selectedModelNames[index] = null;
      this.selectedCarIds[index] = null;
      this.activeColumns = this.activeColumns.filter(c => c !== index);
      this.syncStateService();
      this.updateSEOMetadata();
      this.cdr.detectChanges();
    }
  }
}
