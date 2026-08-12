import { Component, OnInit, ChangeDetectorRef, HostListener, ElementRef } from '@angular/core';
import { SeoService } from '../../services/seo.service';
import { SchemaService } from '../../services/schema.service';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BlogDataService, Article } from '../../services/blog-data.service';
import { getOptimizedImageUrl } from '../../utils/image.utils';
import { formatCardRange, formatCardBattery } from '../../utils/vehicle-card-formatter';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ErrorStateComponent } from '../../components/error-state/error-state.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule, ErrorStateComponent],
  template: `
    <section class="hero">
      <!-- Animated Background and Vignette Overlay -->
      <div class="hero-bg-wrapper">
        <div class="hero-bg-anim"></div>
        <div class="hero-overlay"></div>
      </div>

      <div class="hero-content animate-premium-fade">
        <div class="hero-text-group">
          <h1>Compare Electric Vehicles and Calculate EV Savings </h1>
          <p class="hero-subtitle">EVCorn helps you <a routerLink="/search" class="hero-internal-link">research</a> and <a routerLink="/compare" class="hero-internal-link">compare electric vehicles</a> in India. Explore <a routerLink="/evs" class="hero-internal-link">EV prices, battery and range</a> information, compare models, and understand the real-world savings of switching from petrol to electric.</p>
        </div>
        
        <!-- Embedded Search Bar -->
        <div class="hero-search-block">
          <div class="search-bar-container">
            <div class="input-wrapper">
              <input 
                type="text" 
                placeholder="Search EV specifications, articles, or brands..." 
                (input)="onSearchInput($event)"
                [value]="searchQuery"
              >
              <div class="search-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            </div>
            
            <!-- Floating Results Dropdown -->
            @if (searchQuery.trim().length > 0) {
              <div class="search-results-dropdown">
                <!-- Articles Group -->
                @if (matchingArticles.length > 0) {
                  <div class="results-group">
                    <div style="font-weight: 700; color: #64748B; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 0.5rem;">Articles</div>
                    @for (art of matchingArticles; track art.id) {
                      <a [routerLink]="['/articles', art.id]" (click)="clearSearch()">
                        <div class="result-item article-item">
                          @if (art.imageUrl) {
                            <img 
                              [src]="getOptimizedUrl(art.imageUrl, 200)" 
                              class="result-img" 
                              alt="{{art.title}}"
                              loading="lazy"
                              decoding="async"
                              width="60"
                              height="40"
                              onerror="this.onerror=null; this.style.display='none'; const sibling = this.parentNode.querySelector('.result-placeholder'); if(sibling) sibling.style.display='flex';"
                            >
                          }
                          <div class="result-placeholder" [style.display]="art.imageUrl ? 'none' : 'flex'">⚡</div>
                          <div class="result-text">
                            <span class="result-title">{{ art.title }}</span>
                            <span class="result-desc">{{ art.description }}</span>
                          </div>
                        </div>
                      </a>
                    }
                  </div>
                }
                
                @if (matchingArticles.length === 0) {
                  <div class="no-results">No matches found for "{{ searchQuery }}"</div>
                }
              </div>
            }
          </div>

          <a routerLink="/compare" class="hero-compare-cta">Compare EVs</a>
        </div>
      </div>
    </section>

    <!-- EV Savings Calculator Section -->
    <section class="section calculator-section" style="position: relative; overflow: hidden; background: #FFFFFF; padding: 5rem 0;">
      
      <!-- Premium Ambient Background -->
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; opacity: 1; z-index: 0;">
        <svg viewBox="0 0 1440 600" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;">
          <path d="M-100 150 C 300 50, 500 350, 900 150 C 1200 50, 1300 250, 1600 180" stroke="#10B981" stroke-width="1.5" stroke-opacity="0.22" stroke-linecap="round"/>
          <path d="M-50 250 C 200 400, 600 100, 1000 300 C 1200 400, 1400 200, 1600 280" stroke="#0284C7" stroke-width="1" stroke-opacity="0.18" stroke-linecap="round"/>
          <path d="M-200 350 C 400 250, 700 650, 1100 350 C 1400 200, 1500 350, 1800 300" stroke="#10B981" stroke-width="1" stroke-opacity="0.14" stroke-linecap="round"/>
        </svg>
      </div>

      <div class="calculator-container animate-premium-fade" style="position: relative; z-index: 1; max-width: 600px; margin: 0 auto; width: 92%;">
        <div class="calc-header" style="margin-bottom: 2.5rem; text-align: center;">
          <h2 style="font-size: 2.2rem; font-weight: 800; color: #0F172A; letter-spacing: -0.04em;">EV Savings Calculator</h2>
          <p style="font-size: 1.1rem; color: #64748B; margin-top: 0.8rem;">Configure details to calculate your exact fuel savings & see lifestyle rewards</p>
        </div>
        
        <!-- Unified Premium Card -->
        <div style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(0,0,0,0.04); box-shadow: 0 15px 45px rgba(0,0,0,0.03); border-radius: 24px; padding: 2.5rem; display: flex; flex-direction: column; gap: 2rem;">
          
          <!-- Inputs Group -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            
            <!-- Daily Commute -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-weight: 600; color: #475569; font-size: 0.9rem;">Daily Commute</span>
                <span style="font-weight: 800; color: #10B981; font-size: 1.1rem;">{{ dailyCommute }} km</span>
              </div>
              <input type="range" min="5" max="200" step="5" [value]="dailyCommute" (input)="onCommuteChange($event)" class="blue-slider">
            </div>

            <!-- Two Column Grid for secondary inputs -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; align-items: end;">
              <!-- Petrol Price -->
              <div>
                <div style="font-weight: 600; color: #475569; font-size: 0.85rem; margin-bottom: 0.5rem;">Petrol Price (per L)</div>
                <div style="display: flex; align-items: center; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
                  <button type="button" (click)="adjustPrice(-1)" style="flex: 1; padding: 10px; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #475569; border-right: 1px solid #E2E8F0; transition: background 0.2s;" onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='none'">-</button>
                  <span style="padding: 10px 15px; font-weight: 700; color: #0F172A; font-size: 1rem; text-align: center; min-width: 70px;">₹{{ petrolPrice }}</span>
                  <button type="button" (click)="adjustPrice(1)" style="flex: 1; padding: 10px; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #475569; border-left: 1px solid #E2E8F0; transition: background 0.2s;" onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='none'">+</button>
                </div>
              </div>
              
              <!-- Petrol Mileage -->
              <div>
                <div style="font-weight: 600; color: #475569; font-size: 0.85rem; margin-bottom: 0.5rem;">Mileage (km/L)</div>
                <div style="display: flex; align-items: center; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
                  <button type="button" (click)="adjustMileage(-0.5)" style="flex: 1; padding: 10px; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #475569; border-right: 1px solid #E2E8F0; transition: background 0.2s;" onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='none'">-</button>
                  <span style="padding: 10px 15px; font-weight: 700; color: #0F172A; font-size: 1rem; text-align: center; min-width: 60px;">{{ petrolMileage }}</span>
                  <button type="button" (click)="adjustMileage(0.5)" style="flex: 1; padding: 10px; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #475569; border-left: 1px solid #E2E8F0; transition: background 0.2s;" onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='none'">+</button>
                </div>
              </div>
            </div>

            <!-- EVs Efficiency & Tariff Sliders -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <span style="font-weight: 600; color: #475569; font-size: 0.85rem;">Electricity Tariff</span>
                  <span style="font-weight: 700; color: #0284C7; font-size: 0.95rem;">₹{{ electricityRate }}/unit</span>
                </div>
                <input type="range" min="3" max="15" step="0.5" [value]="electricityRate" (input)="onElectricityRateChange($event)" class="blue-slider">
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <span style="font-weight: 600; color: #475569; font-size: 0.85rem;">EV Efficiency</span>
                  <span style="font-weight: 700; color: #047857; font-size: 0.95rem;">{{ evEfficiency }} km/kWh</span>
                </div>
                <input type="range" min="4" max="10" step="0.2" [value]="evEfficiency" (input)="onEvEfficiencyChange($event)" class="blue-slider">
              </div>
            </div>
          </div>
          
          <div style="height: 1px; background: #F1F5F9; margin: 0 -2.5rem;"></div>

          <!-- Monthly Fuel Cost Comparison -->
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="font-size: 0.85rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem;">Monthly Fuel Cost</div>
            
            <div style="display: flex; align-items: center; justify-content: center; width: 100%; gap: 1rem;">
              <div style="flex: 1; text-align: right; background: #FFF1F2; padding: 1.2rem; border-radius: 16px; border: 1px solid rgba(225, 29, 72, 0.1);">
                <div style="font-size: 0.8rem; font-weight: 600; color: #9F1239; margin-bottom: 0.3rem;">Petrol</div>
                <div style="font-size: 1.6rem; font-weight: 800; color: #BE123C; line-height: 1; letter-spacing: -0.02em;">₹{{ monthlyPetrolCost }}</div>
              </div>
              
              <div style="color: #94A3B8; font-size: 1.5rem; font-weight: 800;">→</div>
              
              <div style="flex: 1; text-align: left; background: #ECFDF5; padding: 1.2rem; border-radius: 16px; border: 1px solid rgba(16, 185, 129, 0.1);">
                <div style="font-size: 0.8rem; font-weight: 600; color: #065F46; margin-bottom: 0.3rem;">EV</div>
                <div style="font-size: 1.6rem; font-weight: 800; color: #047857; line-height: 1; letter-spacing: -0.02em;">₹{{ monthlyEvCost }}</div>
              </div>
            </div>
            
            <!-- Monthly Savings highlight inside comparison block -->
            <div style="margin-top: -14px; z-index: 2; background: #10B981; color: white; padding: 0.6rem 1.5rem; border-radius: 20px; font-weight: 700; box-shadow: 0 4px 15px rgba(16,185,129,0.3); display: flex; align-items: center; gap: 8px;">
              <span>You Save</span>
              <span style="font-size: 1.3rem;">₹{{ monthlySavings }}/mo</span>
            </div>
          </div>

          <div style="height: 1px; background: #F1F5F9; margin: 0 -2.5rem;"></div>

          <!-- Savings Summary Row (Annual & 5-Year) -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; text-align: center;">
            <div style="background: rgba(248, 250, 252, 0.6); border: 1px solid #E2E8F0; padding: 1.5rem; border-radius: 16px;">
              <div style="font-size: 0.85rem; font-weight: 600; color: #64748B; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.03em;">Annual Savings</div>
              <div style="font-size: 2.2rem; font-weight: 800; color: #0F172A; line-height: 1; letter-spacing: -0.02em;">₹{{ annualSavings }}</div>
            </div>
            <div style="background: rgba(240, 253, 244, 0.4); border: 1px solid rgba(16,185,129,0.2); padding: 1.5rem; border-radius: 16px;">
              <div style="font-size: 0.85rem; font-weight: 600; color: #047857; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.03em;">5-Year Savings</div>
              <div style="font-size: 2.2rem; font-weight: 800; color: #10B981; line-height: 1; letter-spacing: -0.02em;">₹{{ (lifetimeSavings / 100000).toFixed(2) }} L</div>
            </div>
          </div>

          <div style="height: 1px; background: #F1F5F9; margin: 0 -2.5rem;"></div>

          <!-- Reward / Lifestyle Impact -->
          <div style="background: #F0F9FF; border: 1px solid #BAE6FD; padding: 1.2rem 1.5rem; border-radius: 16px; display: flex; align-items: center; gap: 16px;">
            <div style="font-size: 2rem;">💡</div>
            <div>
              <div style="font-size: 0.8rem; font-weight: 700; color: #0284C7; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Lifestyle Impact</div>
              <div style="font-size: 0.95rem; font-weight: 600; color: #0F172A; line-height: 1.4;">{{ savingsMilestoneText }}</div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- Clean Air & Emissions Impact Section -->
    <!-- Clean Air & Emissions Impact Section -->
    <section class="section emissions-section" style="position: relative; overflow: hidden; background: #FFFFFF; border-top: 1px solid rgba(0,0,0,0.02); border-bottom: 1px solid rgba(0,0,0,0.02); padding: 5.5rem 0;">
      
      <!-- Photo-Accurate Ambient Background -->
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0.9; z-index: 0;">
        <svg viewBox="0 0 1440 600" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;">
          <path d="M-100 300 C 300 200, 500 400, 900 250 C 1200 150, 1300 300, 1600 250" stroke="#10B981" stroke-width="1.5" stroke-opacity="0.12" stroke-linecap="round"/>
          <path d="M-50 350 C 200 500, 600 150, 1000 350 C 1200 450, 1400 250, 1600 320" stroke="#0284C7" stroke-width="1" stroke-opacity="0.1" stroke-linecap="round"/>
          <path d="M-200 200 C 400 100, 700 500, 1100 200 C 1400 50, 1500 200, 1800 150" stroke="#10B981" stroke-width="1" stroke-opacity="0.08" stroke-linecap="round"/>
        </svg>
        
        <!-- Floating Leaves -->
        <div style="position: absolute; top: 20%; left: 15%; font-size: 1.2rem; opacity: 0.4; transform: rotate(15deg);">🍃</div>
        <div style="position: absolute; top: 60%; left: 8%; font-size: 1rem; opacity: 0.3; transform: rotate(-25deg);">🍃</div>
        <div style="position: absolute; top: 30%; right: 18%; font-size: 1.5rem; opacity: 1; transform: rotate(-10deg);">🍃</div>
        <div style="position: absolute; top: 75%; right: 10%; font-size: 1.1rem; opacity: 0.3; transform: rotate(45deg);">🍃</div>
      </div>

      <div class="calculator-container animate-premium-fade" style="position: relative; z-index: 1;">
        <div class="calc-header" style="margin-bottom: 3.5rem;">
          <h2 style="font-size: 2.2rem; font-weight: 800; color: #0F172A; letter-spacing: -0.04em;">Clean Air Impact: EV vs ICE Emissions</h2>
          <p style="font-size: 1.1rem; color: #64748B; margin-top: 0.5rem;">Hover over each engine source to visualize the visual contrast in real-time air quality & ecosystem health</p>
        </div>

        <div style="max-width: 580px; width: 92%; margin: 0 auto;">
          
          <!-- Mockup-Style Unified Card -->
          <div class="calc-card input-card" style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); border: 1px solid rgba(0,0,0,0.03); box-shadow: 0 12px 40px rgba(0,0,0,0.04); border-radius: 24px; padding: 2rem; display: flex; flex-direction: column; position: relative; overflow: hidden;">
            
            <!-- Optional subtle background graphic as requested -->
            <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(16,185,129,0.03) 0%, transparent 70%); border-radius: 50%; pointer-events: none;"></div>

            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #F1F5F9; padding-bottom: 1.2rem; margin-bottom: 1.8rem;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; color: #10B981; font-size: 1.1rem;">
                  🍃
                </div>
                <h3 style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin: 0; letter-spacing: -0.02em;">Annual CO₂ Footprint</h3>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; color: #64748B; font-size: 0.85rem; font-weight: 600;">
                📅 365 days
              </div>
            </div>
            
            <!-- Bars -->
            <div class="emissions-chart-list" style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 2rem;">
              <!-- Diesel -->
              <div class="emission-item" (mouseenter)="hoveredEmissionSource = 'diesel'" (mouseleave)="hoveredEmissionSource = null" style="padding: 4px; margin: -4px; border-radius: 8px; transition: background 0.2s;" [style.background]="hoveredEmissionSource === 'diesel' ? 'rgba(15, 23, 42, 0.03)' : 'transparent'">
                <div style="display: flex; justify-content: space-between; font-size: 0.95rem; font-weight: 700; color: #1E293B; margin-bottom: 8px;">
                  <span style="display: flex; align-items: center; gap: 8px;">🛢️ Diesel Car</span>
                  <span>{{ annualDieselCo2 | number:'1.0-0' }} kg</span>
                </div>
                <div style="width: 100%; height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden;">
                  <div style="height: 100%; background: #1E293B; border-radius: 3px; transition: width 0.4s ease;" [style.width.%]="getEmissionsPercent(annualDieselCo2)"></div>
                </div>
              </div>

              <!-- Petrol -->
              <div class="emission-item" (mouseenter)="hoveredEmissionSource = 'petrol'" (mouseleave)="hoveredEmissionSource = null" style="padding: 4px; margin: -4px; border-radius: 8px; transition: background 0.2s;" [style.background]="hoveredEmissionSource === 'petrol' ? 'rgba(239, 68, 68, 0.03)' : 'transparent'">
                <div style="display: flex; justify-content: space-between; font-size: 0.95rem; font-weight: 700; color: #1E293B; margin-bottom: 8px;">
                  <span style="display: flex; align-items: center; gap: 8px;">⛽ Petrol Car</span>
                  <span>{{ annualPetrolCo2 | number:'1.0-0' }} kg</span>
                </div>
                <div style="width: 100%; height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden;">
                  <div style="height: 100%; background: #EF4444; border-radius: 3px; transition: width 0.4s ease;" [style.width.%]="getEmissionsPercent(annualPetrolCo2)"></div>
                </div>
              </div>

              <!-- CNG -->
              <div class="emission-item" (mouseenter)="hoveredEmissionSource = 'cng'" (mouseleave)="hoveredEmissionSource = null" style="padding: 4px; margin: -4px; border-radius: 8px; transition: background 0.2s;" [style.background]="hoveredEmissionSource === 'cng' ? 'rgba(245, 158, 11, 0.03)' : 'transparent'">
                <div style="display: flex; justify-content: space-between; font-size: 0.95rem; font-weight: 700; color: #1E293B; margin-bottom: 8px;">
                  <span style="display: flex; align-items: center; gap: 8px;">🔥 CNG Car</span>
                  <span>{{ annualCngCo2 | number:'1.0-0' }} kg</span>
                </div>
                <div style="width: 100%; height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden;">
                  <div style="height: 100%; background: #F59E0B; border-radius: 3px; transition: width 0.4s ease;" [style.width.%]="getEmissionsPercent(annualCngCo2)"></div>
                </div>
              </div>

              <!-- EV -->
              <div class="emission-item" (mouseenter)="hoveredEmissionSource = 'ev'" (mouseleave)="hoveredEmissionSource = null" style="padding: 4px; margin: -4px; border-radius: 8px; transition: background 0.2s;" [style.background]="hoveredEmissionSource === 'ev' ? 'rgba(16, 185, 129, 0.03)' : 'transparent'">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; font-weight: 800; color: #10B981; margin-bottom: 8px;">
                  <span style="display: flex; align-items: center; gap: 8px;">
                    ⚡ Electric EV
                    <span style="background: #ECFDF5; color: #059669; font-size: 0.65rem; padding: 2px 8px; border-radius: 12px; font-weight: 700;">Zero tailpipe</span>
                  </span>
                  <span>0 kg</span>
                </div>
                <div style="width: 100%; height: 6px; background: #F1F5F9; border-radius: 3px; position: relative;">
                  <div style="position: absolute; left: 0; top: -1px; width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></div>
                </div>
              </div>
            </div>

            <!-- Summary Pill -->
            <div style="background: #F0FDF4; border-radius: 20px; padding: 1.2rem 1.5rem; display: flex; align-items: center; justify-content: space-between; transition: background-color 0.3s ease;"
                 [style.backgroundColor]="(hoveredEmissionSource === 'diesel' || hoveredEmissionSource === 'petrol') ? '#FEF2F2' : (hoveredEmissionSource === 'cng' ? '#FFFBEB' : '#F0FDF4')">
              
              <div style="display: flex; align-items: center; gap: 16px;">
                <div style="width: 48px; height: 48px; border-radius: 50%; background: #D1FAE5; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; transition: background 0.3s ease;"
                     [style.backgroundColor]="(hoveredEmissionSource === 'diesel' || hoveredEmissionSource === 'petrol') ? '#FEE2E2' : (hoveredEmissionSource === 'cng' ? '#FEF3C7' : '#D1FAE5')">
                  @if (hoveredEmissionSource === 'diesel' || hoveredEmissionSource === 'petrol') { ⚠️ }
                  @else if (hoveredEmissionSource === 'cng') { 💨 }
                  @else { 🍃 }
                </div>
                <div>
                  <p style="font-size: 0.8rem; color: #475569; margin: 0 0 2px 0; font-weight: 600;">
                    @if (hoveredEmissionSource === 'diesel') { Switching Diesel → EV saves }
                    @else if (hoveredEmissionSource === 'petrol' || !hoveredEmissionSource) { Switching Petrol → EV saves }
                    @else if (hoveredEmissionSource === 'cng') { Switching CNG → EV saves }
                    @else { Switching ICE → EV saves }
                  </p>
                  <div style="display: flex; align-items: baseline; gap: 4px;">
                    <span style="font-size: 1.8rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1; transition: color 0.3s ease;"
                          [style.color]="(hoveredEmissionSource === 'diesel' || hoveredEmissionSource === 'petrol') ? '#EF4444' : (hoveredEmissionSource === 'cng' ? '#F59E0B' : '#059669')">
                      @if (hoveredEmissionSource === 'diesel') { {{ annualDieselCo2 | number:'1.0-0' }} }
                      @else if (hoveredEmissionSource === 'petrol') { {{ annualPetrolCo2 | number:'1.0-0' }} }
                      @else if (hoveredEmissionSource === 'cng') { {{ annualCngCo2 | number:'1.0-0' }} }
                      @else { {{ annualPetrolCo2 | number:'1.0-0' }} }
                    </span>
                    <span style="font-size: 0.9rem; font-weight: 700; color: #475569;">kg CO₂ / yr</span>
                  </div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 12px; padding-left: 1.5rem; border-left: 1px solid rgba(0,0,0,0.05);">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: #D1FAE5; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; transition: background 0.3s ease;"
                     [style.backgroundColor]="(hoveredEmissionSource === 'diesel' || hoveredEmissionSource === 'petrol') ? '#FEE2E2' : (hoveredEmissionSource === 'cng' ? '#FEF3C7' : '#D1FAE5')">
                  🌳
                </div>
                <div>
                  <div style="display: flex; align-items: baseline; gap: 4px; line-height: 1;">
                    <span style="font-size: 1.3rem; font-weight: 800; color: #0F172A;">≈ {{ equivalentTreesPlanted }}</span>
                  </div>
                  <div style="font-size: 0.8rem; color: #64748B; font-weight: 600; margin-top: 4px;">trees</div>
                </div>
              </div>
            </div>

            <!-- Footer Tags -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 1.5rem;">
              <span style="display: flex; align-items: center; gap: 6px; padding: 4px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 20px; font-size: 0.75rem; font-weight: 600; color: #475569;">
                💨 Cleaner Air
              </span>
              <span style="display: flex; align-items: center; gap: 6px; padding: 4px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 20px; font-size: 0.75rem; font-weight: 600; color: #475569;">
                ⚡ Zero Tailpipe
              </span>
              <span style="display: flex; align-items: center; gap: 6px; padding: 4px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 20px; font-size: 0.75rem; font-weight: 600; color: #475569;">
                🤍 Healthier Cities
              </span>
            </div>
            
          </div>
        </div>
      </div>
    </section>

    <!-- EV Charging Time & Socket Calculator -->
    <section class="section charging-calc-section" style="position: relative; overflow: hidden; background: #FAFAFA; padding: 6rem 0;">
      
      <!-- Ambient Pastel Wave Background -->
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0.85; z-index: 0;">
        <svg viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;">
          <path d="M-100 200 C 300 100, 600 400, 1000 200 C 1300 50, 1500 250, 1800 100" stroke="#00D2FF" stroke-width="1.2" stroke-opacity="0.15" stroke-linecap="round"/>
          <path d="M-50 400 C 250 500, 700 150, 1100 350 C 1350 450, 1550 300, 1800 400" stroke="#FF007F" stroke-width="1" stroke-opacity="0.1" stroke-linecap="round"/>
          <path d="M-200 600 C 400 450, 800 700, 1200 450 C 1450 300, 1600 500, 1900 350" stroke="#7952FF" stroke-width="1" stroke-opacity="0.1" stroke-linecap="round"/>
          <path d="M0 100 C 400 300, 900 100, 1300 400 C 1500 600, 1700 200, 1900 300" stroke="#10B981" stroke-width="0.8" stroke-opacity="0.15" stroke-linecap="round"/>
        </svg>
      </div>

      <style>
        .blue-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          background: #E2E8F0;
          border-radius: 4px;
          outline: none;
        }
        .blue-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 4.5px solid #BFDBFE;
          box-shadow: 0 0 0 1px #3B82F6 inset, 0 2px 4px rgba(0,0,0,0.1);
          cursor: pointer;
        }
        .blue-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 4.5px solid #BFDBFE;
          box-shadow: 0 0 0 1px #3B82F6 inset, 0 2px 4px rgba(0,0,0,0.1);
          cursor: pointer;
        }
        .calc-divider {
          display: none;
        }
        @media (min-width: 600px) {
          .calc-divider {
            display: block;
          }
        }
      </style>

      <div class="calculator-container animate-premium-fade" style="position: relative; z-index: 1; max-width: 680px; margin: 0 auto; width: 92%; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); border: 1px solid rgba(0,0,0,0.03); box-shadow: 0 15px 40px rgba(0,0,0,0.02); border-radius: 20px; padding: 2.5rem; overflow: hidden;">
        <div class="calc-header" style="margin-bottom: 2rem; text-align: center;">
          <h2 style="font-size: 2rem; font-weight: 800; color: #0F172A; letter-spacing: -0.04em; margin: 0;">EV Charging Simulator</h2>
          <p style="font-size: 1rem; color: #64748B; margin-top: 0.5rem; margin-bottom: 0;">Calculate your real-world charging time.</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1.75rem; margin-bottom: 2rem;">

  <!-- Battery -->
  <div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 0.75rem;">
      <div style="font-size: 0.95rem; font-weight: 600; color: #64748B;">Battery</div>
      <div style="font-size: 1.25rem; font-weight: 800; color: #0F172A;">
        {{ chargeBatterySize }} kWh
      </div>
    </div>

    <input
      type="range"
      min="10"
      max="110"
      step="1"
      [(ngModel)]="chargeBatterySize"
      (input)="onCustomBatteryChange()"
      class="blue-slider"
    >

    <div style="display: flex; justify-content: space-between; margin-top: 0.35rem; font-size: 0.75rem; color: #64748B;">
      <span>10 kWh</span>
      <span>110 kWh</span>
    </div>
  </div>


  <!-- Charging -->
  <div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 0.75rem;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="font-size: 0.95rem; font-weight: 600; color: #64748B;">
          Charging
        </div>

        <div style="display: flex; background: #F1F5F9; border-radius: 7px; padding: 2px;">
          <button
            type="button"
            (click)="onChargingModeChange('AC')"
            [style.background]="chargingMode === 'AC' ? '#FFFFFF' : 'transparent'"
            [style.color]="chargingMode === 'AC' ? '#0F172A' : '#64748B'"
            style="border: 0; border-radius: 5px; padding: 4px 10px; font-size: 0.75rem; font-weight: 700; cursor: pointer;"
          >
            AC
          </button>

          <button
            type="button"
            (click)="onChargingModeChange('DC')"
            [style.background]="chargingMode === 'DC' ? '#FFFFFF' : 'transparent'"
            [style.color]="chargingMode === 'DC' ? '#0F172A' : '#64748B'"
            style="border: 0; border-radius: 5px; padding: 4px 10px; font-size: 0.75rem; font-weight: 700; cursor: pointer;"
          >
            DC
          </button>
        </div>
      </div>

      <div style="font-size: 1.25rem; font-weight: 800; color: #3B82F6;">
        {{ selectedChargerSpeed }} kW
      </div>
    </div>

    <input
      type="range"
      [min]="chargingMode === 'AC' ? 0 : 0"
      [max]="chargingMode === 'AC' ? 22 : 400"
      [step]="chargingMode === 'AC' ? 0.1 : 1"
      [(ngModel)]="selectedChargerSpeed"
      (input)="onChargerSpeedChange()"
      class="blue-slider"
    >

    <div style="display: flex; justify-content: space-between; margin-top: 0.35rem; font-size: 0.75rem; color: #64748B;">
      <span>0 kW</span>
      <span>{{ chargingMode === 'AC' ? '22 kW' : '400 kW' }}</span>
    </div>
  </div>


  <!-- Start + Target -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">

    <!-- Start -->
    <div>
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 0.75rem;">
        <div style="font-size: 0.95rem; font-weight: 600; color: #64748B;">Start</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: #0F172A;">
          {{ startSoc }}%
        </div>
      </div>

      <input
        type="range"
        min="0"
        max="90"
        step="5"
        [(ngModel)]="startSoc"
        (input)="onStartSocChange()"
        class="blue-slider"
      >
    </div>


    <!-- Target -->
    <div>
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 0.75rem;">
        <div style="font-size: 0.95rem; font-weight: 600; color: #64748B;">Target</div>
        <div style="font-size: 1.25rem; font-weight: 800; color: #0F172A;">
          {{ targetSoc }}%
        </div>
      </div>

      <input
        type="range"
        min="10"
        max="100"
        step="5"
        [(ngModel)]="targetSoc"
        (input)="onTargetSocChange()"
        class="blue-slider"
      >
    </div>

  </div>

</div>

        <!-- Result Section -->
        <div class="calc-result-box" style="background: rgba(240, 253, 244, 0.5); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 14px; padding: 1.5rem; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1.5rem;">

          <div style="text-align: center; flex: 1; min-width: 120px;">
            <div style="font-size: 1.8rem; font-weight: 800; color: #0F172A; line-height: 1.2;">{{ calculatedChargeTime }}</div>
            <div style="font-size: 0.85rem; font-weight: 600; color: #64748B; margin-top: 4px;">Estimated Time</div>
          </div>

          <div class="calc-divider" style="width: 1px; height: 40px; background: rgba(16, 185, 129, 0.2);"></div>

          <div style="text-align: center; flex: 1; min-width: 120px;">
            <div style="font-size: 1.8rem; font-weight: 800; color: #10B981; line-height: 1.2;">+{{ rangeAdded }} km</div>
            <div style="font-size: 0.85rem; font-weight: 600; color: #64748B; margin-top: 4px;">Range Added</div>
          </div>

          <div class="calc-divider" style="width: 1px; height: 40px; background: rgba(16, 185, 129, 0.2);"></div>

          <div style="text-align: center; flex: 1; min-width: 120px;">
            <div style="font-size: 1.8rem; font-weight: 800; color: #0F172A; line-height: 1.2;">{{ startSoc }} <span style="color: #94A3B8; font-weight: 400;">&rarr;</span> {{ targetSoc }}%</div>
            <div style="font-size: 0.85rem; font-weight: 600; color: #64748B; margin-top: 4px;">Battery <span style="color: #10B981; font-weight: 500; font-size: 0.75rem;">(≈ 108 trees)</span></div>
          </div>

        </div>
      </div>
    </section>

    <!-- EV Finder Section -->
    <section class="section finder-section">
      <div class="finder-container">
        <div class="calc-header">
          <h2>Find Your Perfect EV</h2>
          <p>Answer 2 quick questions to find the best electric car for your budget and garage space</p>
        </div>

        <div class="finder-card">
          <!-- Step 1: Budget Selection -->
          @if (quizStep === 1) {
            <div class="step-container fade-in">
              <span class="step-badge">Step 1 of 2</span>
              <h3>What is your purchasing budget?</h3>
              
              <div class="options-grid">
                <button type="button" class="opt-card" (click)="selectBudget('budget')">
                  <span class="opt-icon">
                    <svg class="vector-shape" viewBox="0 0 24 24">
                      <rect x="2" y="4" width="20" height="16" rx="4" />
                      <path d="M16 12h4" />
                      <path d="M12 8a2.5 2.5 0 0 1 2 2" />
                    </svg>
                  </span>
                  <span class="opt-title">Under ₹12 Lakhs</span>
                  <span class="opt-desc">Affordable city EVs like MG Comet, Tiago EV, Punch EV</span>
                </button>
                
                <button type="button" class="opt-card" (click)="selectBudget('mid')">
                  <span class="opt-icon">
                    <svg class="vector-shape" viewBox="0 0 24 24">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </span>
                  <span class="opt-title">₹12 - ₹20 Lakhs</span>
                  <span class="opt-desc">Mid-range family cars like Windsor EV, Nexon EV, ZS EV</span>
                </button>
                
                <button type="button" class="opt-card" (click)="selectBudget('premium')">
                  <span class="opt-icon">
                    <svg class="vector-shape" viewBox="0 0 24 24">
                      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
                      <rect x="5" y="18" width="14" height="2" rx="1" />
                    </svg>
                  </span>
                  <span class="opt-title">Above ₹20 Lakhs</span>
                  <span class="opt-desc">Premium long-range EVs like BYD Seal, Atto 3, Ioniq 5</span>
                </button>
              </div>
            </div>
          }

          <!-- Step 2: Size Selection -->
          @if (quizStep === 2) {
            <div class="step-container fade-in">
              <span class="step-badge">Step 2 of 2</span>
              <h3>What size fits your lifestyle & garage?</h3>
              
              <div class="options-grid size-grid">
                <button type="button" class="opt-card" (click)="selectSize('mini')">
                  <span class="opt-icon">
                    <svg class="vector-shape" viewBox="0 0 24 24">
                      <path d="M4 14h16v2H4z" />
                      <path d="M4 14v-2c0-.5.4-1 .9-1.2l3.2-1.3c.5-.2.9-.6 1.1-1.1L11 6h2l1.8 2.4c.2.5.6.9 1.1 1.1l3.2 1.3c.5.2.9.7.9 1.2v2" />
                      <circle cx="7.5" cy="14.5" r="2" />
                      <circle cx="16.5" cy="14.5" r="2" />
                    </svg>
                  </span>
                  <span class="opt-title">City Mini / Hatchback</span>
                  <span class="opt-desc">Length &lt; 3.8m. Easy parking and tight city maneuvers.</span>
                </button>

                <button type="button" class="opt-card" (click)="selectSize('compact')">
                  <span class="opt-icon">
                    <svg class="vector-shape" viewBox="0 0 24 24">
                      <path d="M7 4.5h10" />
                      <path d="M3 14h18v2H3z" />
                      <path d="M3 14v-3c0-.8.6-1.5 1.4-1.7l3.8-1.1c.6-.2 1.1-.6 1.4-1.2L11 5h2l1.4 1.5c.3.6.8 1 1.4 1.2l3.8 1.1c.8.2 1.4.9 1.4 1.7v3" />
                      <circle cx="7.5" cy="14.5" r="2.2" />
                      <circle cx="16.5" cy="14.5" r="2.2" />
                    </svg>
                  </span>
                  <span class="opt-title">Compact SUV / Hatch</span>
                  <span class="opt-desc">Length ~4.0m. Perfect daily family commuter.</span>
                </button>

                <button type="button" class="opt-card" (click)="selectSize('mid')">
                  <span class="opt-icon">
                    <svg class="vector-shape" viewBox="0 0 24 24">
                      <path d="M3 14h18v2H3z" />
                      <path d="M3 14v-3c0-1 .7-1.8 1.7-2l5.5-1.5c.5-.1.9-.4 1.1-.9L13 5.5h2.5l2 2.2c.2.4.6.7 1.1.9l4.2 1c1 .2 1.7 1 1.7 2v3" />
                      <circle cx="7.5" cy="14.5" r="2.2" />
                      <circle cx="16.5" cy="14.5" r="2.2" />
                    </svg>
                  </span>
                  <span class="opt-title">Mid-Size Crossover</span>
                  <span class="opt-desc">Length 4.2m - 4.4m. Spacious cabin and ultimate comfort.</span>
                </button>

                <button type="button" class="opt-card" (click)="selectSize('premium')">
                  <span class="opt-icon">
                    <svg class="vector-shape" viewBox="0 0 24 24">
                      <path d="M2 14h20v2H2z" />
                      <path d="M3 14v-2.5c0-.8.6-1.5 1.3-1.6L9 9l2.5-3.5h3.5l3.5 4 3.7.9c.7.2 1.3.8 1.3 1.6V14" />
                      <circle cx="7.5" cy="14.5" r="2.2" />
                      <circle cx="16.5" cy="14.5" r="2.2" />
                    </svg>
                  </span>
                  <span class="opt-title">Premium SUV / Sedan</span>
                  <span class="opt-desc">Length &gt; 4.4m. Maximum highway range & performance.</span>
                </button>
              </div>
              
              <button type="button" class="back-btn" (click)="quizStep = 1">← Go Back</button>
            </div>
          }

          <!-- Step 3: Recommendations -->
          @if (quizStep === 3) {
            <div class="step-container fade-in">
              @if (quizResults.length > 0) {
                <span class="step-badge success-badge">Matched Results</span>
                <h3>Your Recommended EVs</h3>
                
                <div class="results-grid">
                  @for (car of quizResults; track car.id) {
                    <div class="recommended-car-card">
                      <div class="recommendation-header">
                        <h4>{{ car.name }}</h4>
                        <span class="rec-price">{{ car.price }}</span>
                      </div>
                      
                      <div class="rec-specs">
                        <div class="spec-row">
                          <span>Claimed Range:</span>
                          <strong>{{ formatRange(car.range) }}</strong>
                        </div>
                        <div class="spec-row">
                          <span>Battery Capacity:</span>
                          <strong>{{ formatBattery(car.batteryCapacity) }}</strong>
                        </div>
                        <div class="spec-row">
                          <span>Dimensions:</span>
                          <strong>{{ car.dimensions }}</strong>
                        </div>
                        <div class="spec-row">
                          <span>Ground Clearance:</span>
                          <strong>{{ car.groundClearance }}</strong>
                        </div>
                      </div>
                      
                      <div class="rec-actions">
                        <a routerLink="/compare" [queryParams]="{ brand: car.categoryId, model: car.name }" class="compare-btn">
                          Compare Specs
                        </a>
                        
                        @if (getRelatedArticle(car.name); as art) {
                          <a [routerLink]="['/articles', art.id]" class="related-article-link" [title]="art.title">
                            📰 Read Review: {{ art.title }}
                          </a>
                        } @else {
                          <a routerLink="/articles" [queryParams]="{ category: car.categoryId }" class="related-article-link">
                            🏷️ View {{ car.name.split(' ')[0] }} EV Articles
                          </a>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <span class="step-badge" style="background: rgba(239, 68, 68, 0.1); color: #EF4444;">No Matches</span>
                <h3>No Exact Matches Found</h3>
                
                <div class="no-quiz-results-card fade-in">
                  <span class="no-res-icon">🔍</span>
                  <h4>No Cars Fit This Combination</h4>
                  <p>We couldn't find an EV in our database that strictly fits your selected budget and garage size. Try running the quiz again with a different budget or size.</p>
                </div>
              }
              
              <button type="button" class="reset-btn" (click)="resetQuiz()">Start Quiz Again ↻</button>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- SEO Substantive Content Section -->
    <section class="section seo-content-section" style="background: #FAFAFA; padding: 6rem 0; border-top: 1px solid rgba(0,0,0,0.03); border-bottom: 1px solid rgba(0,0,0,0.03);">
      <div class="seo-container animate-premium-fade" style="max-width: 1000px; margin: 0 auto; width: 92%; display: flex; flex-direction: column; gap: 3rem;">
        
        <div class="seo-block" style="background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(0,0,0,0.04); box-shadow: 0 10px 40px rgba(0,0,0,0.03); border-radius: 24px; padding: 3rem;">
          <h2 style="font-size: 1.8rem; font-weight: 800; color: #0F172A; margin-bottom: 1.2rem; letter-spacing: -0.03em;">Compare Electric Vehicles in India</h2>
          <p style="font-size: 1.1rem; color: #475569; line-height: 1.7; margin: 0;">EVCorn provides a comprehensive platform to research the latest electric car models available in the Indian market. You can <a routerLink="/compare" style="color: #3B82F6; font-weight: 600; text-decoration: none;">compare important specifications</a> such as battery capacity, real-world range, performance, and current <a routerLink="/evs" style="color: #3B82F6; font-weight: 600; text-decoration: none;">EV prices</a> to make an informed purchasing decision.</p>
        </div>

        <div class="seo-block" style="background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(0,0,0,0.04); box-shadow: 0 10px 40px rgba(0,0,0,0.03); border-radius: 24px; padding: 3rem;">
          <h2 style="font-size: 1.8rem; font-weight: 800; color: #0F172A; margin-bottom: 1.2rem; letter-spacing: -0.03em;">Understand EV Savings</h2>
          <p style="font-size: 1.1rem; color: #475569; line-height: 1.7; margin: 0;">Evaluating an electric vehicle goes beyond the showroom price; running-cost comparisons are crucial. Our interactive savings calculator helps you visualize your monthly and annual fuel savings by directly comparing your daily petrol commute costs against local electric <a routerLink="/energy" style="color: #3B82F6; font-weight: 600; text-decoration: none;">energy</a> tariffs.</p>
        </div>

        <div class="seo-block" style="background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(0,0,0,0.04); box-shadow: 0 10px 40px rgba(0,0,0,0.03); border-radius: 24px; padding: 3rem;">
          <h2 style="font-size: 1.8rem; font-weight: 800; color: #0F172A; margin-bottom: 1.2rem; letter-spacing: -0.03em;">Explore EV Charging and Ownership</h2>
          <p style="font-size: 1.1rem; color: #475569; line-height: 1.7; margin: 0;">Understanding charging times and infrastructure is essential for new EV owners. We provide an advanced <a routerLink="/charging" style="color: #3B82F6; font-weight: 600; text-decoration: none;">EV charging</a> simulator to estimate exact charging durations across different charger types—from standard AC home wallboxes to ultra-fast DC public chargers—and measure the equivalent environmental impact.</p>
        </div>

        <div class="seo-block" style="background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(0,0,0,0.04); box-shadow: 0 10px 40px rgba(0,0,0,0.03); border-radius: 24px; padding: 3rem;">
          <h2 style="font-size: 1.8rem; font-weight: 800; color: #0F172A; margin-bottom: 1.2rem; letter-spacing: -0.03em;">Find the Right Electric Vehicle</h2>
          <p style="font-size: 1.1rem; color: #475569; line-height: 1.7; margin: 0;">If you're unsure where to start, our guided discovery experience matches you with the ideal EV based on your budget and preferred body style. Whether you need a compact city hatchback or a premium long-range SUV, explore our curated <a routerLink="/articles" style="color: #3B82F6; font-weight: 600; text-decoration: none;">articles</a> and recommendations to find your perfect fit.</p>
        </div>

      </div>
    </section>

    <section class="section articles" id="articles">
      <h2>Latest Insights</h2>
      @if (articlesState === 'loading') {
        <div class="grid animate-premium-fade">
          @for (i of [1, 2, 3]; track i) {
            <div class="card skeleton-card" aria-hidden="true">
              <div class="skeleton-line" style="width: 70%; height: 20px;"></div>
              <div class="skeleton-line" style="width: 100%; height: 14px; margin-top: 14px;"></div>
              <div class="skeleton-line" style="width: 85%; height: 14px;"></div>
            </div>
          }
        </div>
      } @else if (articlesState === 'error') {
        <app-error-state
          message="Unable to load the latest insights right now. Please try again in a few moments."
          (retry)="loadData()">
        </app-error-state>
      } @else {
        <div class="grid animate-premium-fade">
          @for (art of latestArticles; track art.id) {
            <a class="card" [routerLink]="['/articles', art.id]" style="display: block; text-decoration: none; color: inherit; cursor: pointer;">
              <h3>{{ art.title }}</h3>
              <p>{{ art.description }}</p>
            </a>
          } @empty {
            <div class="card">
              <h3>No Insights Yet</h3>
              <p>Stay tuned for upcoming EV insights and comparisons!</p>
            </div>
          }
        </div>
      }
    </section>


  `,
  styles: [`
    .emissions-grid {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 40px;
      align-items: stretch;
    }
    @media (max-width: 900px) {
      .emissions-grid {
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }

    .hero {
      height: 82vh;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      padding: clamp(120px, 15vh, 160px) 20px clamp(40px, 6vh, 60px) 20px;
    }
    .hero-bg-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      z-index: 1;
      pointer-events: none;
    }
    @media (min-width: 1025px) {
      .hero {
        height: 92vh; /* Large height on desktop to match 16:9 aspect ratio and eliminate horizontal cropping */
      }
    }
    .hero-bg-anim {
      position: absolute;
      opacity: 0.70;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url('/evcorn-hero-v2.png');
      background-size: cover;
      background-position: center 42%; /* Focus on the car and sunset, ensuring they are not cropped */
      z-index: 1;
      transform-origin: center center;
      transform: scale(1.02) translate(var(--mx, 0px), var(--my, 0px));
      transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
      animation: kenBurns 28s ease-in-out infinite, sunShimmer 8s ease-in-out infinite;
    }
    .hero-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      /* Narrow edge blending (5%) so the 8K photo details and sunset colors are 95% raw, bright, and untouched */
       background: none;
      z-index: 2;
      pointer-events: none;
    }
    .hero-content {
      position: relative;
      z-index: 3;
      width: 100%;
      max-width: 800px;
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: space-between;
    }
    .hero-text-group {
      margin-top: 10px;
    }
    .hero h1 {
  font-size: clamp(2.4rem, 6vw, 3.8rem);
  font-weight: 600;
  margin-bottom: 0.5rem;
  line-height: 1.25;
  color: #0F172A;
  letter-spacing: -0.03rem;
  text-shadow: none;
}
    .hero p {
      font-size: clamp(1.1rem, 2.5vw, 1.4rem);
      color: #334155;
      font-weight: 600;
      letter-spacing: 0.05rem;
    }
    .hero .hero-subtitle {
      font-size: clamp(1rem, 2vw, 1.15rem);
      color: #0F172A;
      margin-top: 1rem;
      line-height: 1.6;
      max-width: 700px;
      margin-left: auto;
      margin-right: auto;
      font-weight: 400;
      letter-spacing: normal;
      text-shadow: none;
    }
    .hero .hero-internal-link {
      color: #0F172A;
      text-decoration: underline;
      text-decoration-color: rgba(255, 255, 255, 0.4);
      text-underline-offset: 4px;
      transition: text-decoration-color 0.2s ease;
    }
    .hero .hero-internal-link:hover {
      text-decoration-color: #0F172A;
    }
    @keyframes kenBurns {
      0% {
        transform: scale(1.02) translate(var(--mx, 0px), var(--my, 0px));
      }
      50% {
        transform: scale(1.06) translate(calc(var(--mx, 0px) - 4px), calc(var(--my, 0px) - 4px));
      }
      100% {
        transform: scale(1.02) translate(var(--mx, 0px), var(--my, 0px));
      }
    }
    @keyframes sunShimmer {
      0% { filter: brightness(1) contrast(1); }
      50% { filter: brightness(1.04) contrast(1.02); }
      100% { filter: brightness(1) contrast(1); }
    }
    .section {
      padding: clamp(3rem, 10vw, 6rem) clamp(1.5rem, 5vw, 4rem);
      background: #FFFFFF;
    }
    .articles {
      background: #F8F9FA;
      min-height: 600px;
    }
    .trending {
      min-height: 450px;
    }
    .trending h2, .articles h2 {
      font-size: clamp(1.8rem, 5vw, 3rem);
      text-align: center;
      margin-bottom: clamp(1.5rem, 5vw, 3rem);
      color: #1A202C;
    }
    .carousel {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(clamp(140px, 45%, 250px), 1fr));
      gap: clamp(1rem, 3vw, 2rem);
      padding: 1.5rem 0.5rem;
      min-height: 250px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(clamp(250px, 100%, 300px), 1fr));
      gap: 30px;
      min-height: 400px;
      padding: 1rem 0;
    }
    .card {
      min-width: clamp(140px, 100%, 280px);
      background: #FFFFFF;
      padding: clamp(1rem, 4vw, 2rem);
      border-radius: 16px;
      text-align: center;
      border: 1px solid rgba(0, 0, 0, 0.05);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.01);
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card:hover {
      transform: translateY(-6px) scale(1.02);
      border-color: rgba(0, 136, 204, 0.35);
      box-shadow: 0 15px 35px rgba(0, 136, 204, 0.12), 0 0 15px rgba(0, 136, 204, 0.05);
      cursor: pointer;
    }
    .logo-wrapper {
      height: clamp(40px, 10vw, 60px);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: clamp(0.8rem, 3vw, 1.5rem);
    }
    .vector-logo {
      width: clamp(40px, 10vw, 60px);
      height: clamp(40px, 10vw, 60px);
      transition: transform 0.3s ease;
    }
    .card:hover .vector-logo {
      transform: scale(1.1);
    }
    .rivian-yellow {
      fill: #FFB800;
    }
    .tesla-red {
      fill: #E82127;
    }
    .rimac-cyan {
      fill: #00B4D8;
    }
    .text-logo {
      font-family: 'Inter', sans-serif;
      font-weight: 300;
      font-size: clamp(1.2rem, 5vw, 1.8rem);
      letter-spacing: clamp(0.2rem, 2vw, 0.6rem);
      color: #2D3748;
      transition: transform 0.3s ease, color 0.3s ease;
    }
    .card:hover .text-logo {
      transform: scale(1.05);
      color: #0088CC;
    }
    .byd-silver {
      font-weight: 700;
      font-size: clamp(1.5rem, 5vw, 2.2rem);
      letter-spacing: clamp(0.1rem, 1vw, 0.2rem);
      color: #718096;
    }
    .card h3 {
      font-size: clamp(1.1rem, 4vw, 1.5rem);
      color: #1D1D1F;
      margin-bottom: 0.5rem;
    }
    .card p {
      font-size: 1rem;
      color: #4A5568;
      line-height: 1.6;
    }
    .count-badge {
      display: inline-block;
      margin-top: 8px;
      font-size: 0.85rem;
      color: #0088CC;
      background: rgba(0, 136, 204, 0.05);
      border: 1px solid rgba(0, 136, 204, 0.15);
      padding: 2px 10px;
      border-radius: 20px;
      font-weight: 500;
    }
    .hero-search-block {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: auto;
    }
    .search-bar-container {
      position: relative;
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      z-index: 100;
    }
    .hero-compare-cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 1.1rem auto 0;
      padding: 10px 22px;
      border-radius: 999px;
      border: 1px solid #0088CC;
      background: #0088CC;
      box-shadow: 0 6px 18px rgba(0, 136, 204, 0.20);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.95rem;
      text-decoration: none;
      letter-spacing: 0.01em;
      transition: all 0.2s ease;
      position: relative;
      z-index: 100;
    }
    .hero-compare-cta:hover {
      background: #006FA6;
      border-color: #006FA6;
      transform: translateY(-1px);
    }
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-bar-container input {
      width: 100%;
      padding: 16px 50px 16px 25px;
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 30px;
      color: #0F172A;
      font-size: 1.1rem;
      outline: none;
      box-shadow:
  0 8px 24px rgba(15, 23, 42, 0.10),
  inset 0 1px 0.5px rgba(255, 255, 255, 0.7);
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }
    .search-bar-container input::placeholder {
      color: rgba(15, 23, 42, 0.60);
    }
    .search-bar-container input:focus {
      background: rgba(255, 255, 255, 0.18);
      border-color: rgba(255, 255, 255, 0.45);
      box-shadow: 
        0 15px 35px rgba(0, 0, 0, 0.3), 
        0 0 0 1px rgba(255, 255, 255, 0.2),
        inset 0 1px 0.5px rgba(255, 255, 255, 0.4);
    }
    .search-icon {
      position: absolute;
      right: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.75);
      pointer-events: none;
      transition: all 0.3s ease;
    }
    .search-bar-container input:focus + .search-icon {
      transform: scale(1.1);
      color: #FFFFFF;
    }
    .search-results-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      left: 0;
      width: 100%;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.55);
      border-radius: 16px;
      max-height: 400px;
      overflow-y: auto;
      text-align: left;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
      z-index: 999;
    }
    .results-group {
      padding: 15px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }
    .results-group:last-child {
      border-bottom: none;
    }
    .results-group h4 {
      font-size: 0.8rem;
      color: #0088CC;
      text-transform: uppercase;
      margin-bottom: 10px;
      letter-spacing: 0.1rem;
    }
    .result-item {
      padding: 10px 12px;
      border-radius: 6px;
      color: #2D3748;
      transition: all 0.2s ease;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .result-item:hover {
      background: rgba(0, 136, 204, 0.05);
      color: #0088CC;
    }
    .article-item {
      align-items: flex-start;
    }
    .result-img {
      width: 60px;
      height: 45px;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid rgba(0, 0, 0, 0.05);
      flex-shrink: 0;
    }
    .result-placeholder {
      width: 60px;
      height: 45px;
      border-radius: 4px;
      background: rgba(0, 136, 204, 0.05);
      color: #0088CC;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      font-weight: bold;
      flex-shrink: 0;
    }
    .result-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .result-title {
      font-weight: 600;
      font-size: 0.95rem;
      color: #1A202C;
    }
    .result-desc {
      font-size: 0.8rem;
      color: #718096;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .no-results {
      padding: 20px;
      text-align: center;
      color: #718096;
      font-size: 0.95rem;
    }
    .skeleton-card {
      display: flex;
      flex-direction: column;
      gap: 0;
      cursor: default;
    }
    .skeleton-line {
      border-radius: 6px;
      background: linear-gradient(90deg, #EEF1F4 25%, #E4E8EC 37%, #EEF1F4 63%);
      background-size: 400% 100%;
      animation: skeleton-shimmer-home 1.4s ease infinite;
    }
    @keyframes skeleton-shimmer-home {
      0% { background-position: 100% 50%; }
      100% { background-position: 0 50%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .skeleton-line { animation: none; }
    }
    a {
      text-decoration: none;
    }

    @media (max-width: 768px) {
      .hero h1 {
        font-size: 3rem;
      }
      .hero p {
        font-size: 1.3rem;
      }
      .section {
        padding: 4rem 2rem;
      }
      .trending h2, .articles h2 {
        font-size: 2.2rem;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  latestArticles: Article[] = [];
  allArticlesList: Article[] = [];
  categoriesList: any[] = [];
  searchQuery = '';
  /** Drives the "Latest Insights" section only - the rest of this page (calculators, quiz) has no server dependency. */
  articlesState: 'loading' | 'loaded' | 'error' = 'loading';



  // Savings Calculator Variables
  dailyCommute = 50; 
  petrolPrice = 104; 
  petrolMileage = 14; 
  electricityRate = 8; 
  evEfficiency = 7; 
  hoveredEmissionSource: string | null = null; // Tracks which emission source is hovered 

  // EV Finder Wizard Variables
  quizStep = 1;
  quizBudget = '';
  quizSize = '';
  quizResults: any[] = [];
  vehiclesList: any[] = [];



  getCleanSeating(seatingRaw: string): string {
    if (!seatingRaw) return '';
    return seatingRaw.replace(/[^\d]/g, '');
  }

  selectBudget(budget: string) {
    this.quizBudget = budget;
    this.quizStep = 2;
    this.cdr.detectChanges();
  }

  selectSize(size: string) {
    this.quizSize = size;
    this.runQuizFilter();
  }

  resetQuiz() {
    this.quizStep = 1;
    this.quizBudget = '';
    this.quizSize = '';
    this.quizResults = [];
    this.cdr.detectChanges();
  }

  getNormalizedPrice(priceStr: string): number {
    // If price is in USD (e.g. "$45,000" or "$38,990")
    if (priceStr.includes('$')) {
      const clean = priceStr.replace(/[^0-9.]/g, '');
      const usd = parseFloat(clean) || 0;
      // Convert USD to Lakhs: e.g. $45,000 * 83 / 100,000 = 37.35 Lakhs
      return (usd * 83) / 100000;
    }
    // If price is already in Lakhs (e.g. "Rs. 9.69 Lakh")
    const match = priceStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  parseLength(dimensionsStr: string): number {
    const match = dimensionsStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  runQuizFilter() {
    if (this.vehiclesList.length === 0) {
      this.quizStep = 3;
      return;
    }

    this.quizResults = this.vehiclesList.filter(car => {
      const price = this.getNormalizedPrice(car.price);
      const length = this.parseLength(car.dimensions);

      // 1. Filter by Budget (Strict starting price matching)
      let matchesBudget = false;
      if (this.quizBudget === 'budget') {
        matchesBudget = price < 12.0; // Strictly under 12 Lakhs (Comet, Tiago, Punch)
      } else if (this.quizBudget === 'mid') {
        matchesBudget = price >= 12.0 && price <= 20.0; // 12L to 20L (Nexon, Windsor, ZS EV)
      } else if (this.quizBudget === 'premium') {
        matchesBudget = price > 20.0; // Strictly above 20 Lakhs (Atto 3, Seal, etc.)
      }

      // 2. Filter by Size (Strict dimension limits in mm)
      let matchesSize = false;
      const lowerName = car.name.toLowerCase();
      if (this.quizSize === 'mini') {
        matchesSize = length < 3800 || lowerName.includes('comet') || lowerName.includes('tiago');
      } else if (this.quizSize === 'compact') {
        matchesSize = length >= 3800 && length < 4100; // Under 4.1m (Punch, Nexon)
      } else if (this.quizSize === 'mid') {
        matchesSize = length >= 4100 && length < 4400; // 4.1m - 4.4m (Windsor, Curvv)
      } else if (this.quizSize === 'premium') {
        matchesSize = length >= 4400; // Above 4.4m (Atto 3, Seal)
      }

      return matchesBudget && matchesSize;
    });

    this.quizStep = 3;
    this.cdr.detectChanges();
  }

  getRelatedArticle(carName: string): any {
    if (this.allArticlesList.length === 0) return null;
    
    // Clean name (e.g. "Tata Punch EV" -> "punch ev" or "punch")
    const cleanName = carName.replace(/tata|mg|byd|hyundai|kia/gi, '').trim().toLowerCase();
    
    // Find first active article matching this car's name
    const match = this.allArticlesList.find(art => 
      art.active && 
      (art.title.toLowerCase().includes(cleanName) || 
       (art.description && art.description.toLowerCase().includes(cleanName)))
    );
    return match || null;
  } 

  get monthlyPetrolCost(): number {
    const totalKm = this.dailyCommute * 30;
    const litresNeeded = totalKm / this.petrolMileage;
    return Math.round(litresNeeded * this.petrolPrice);
  }

  get monthlyEvCost(): number {
    const totalKm = this.dailyCommute * 30;
    const kwhNeeded = totalKm / this.evEfficiency;
    return Math.round(kwhNeeded * this.electricityRate);
  }

  get monthlySavings(): number {
    return Math.max(0, this.monthlyPetrolCost - this.monthlyEvCost);
  }

  get annualSavings(): number {
    return this.monthlySavings * 12;
  }

  get lifetimeSavings(): number {
    return this.annualSavings * 5;
  }

  get savingsMilestoneText(): string {
    const savings = this.annualSavings;
    if (savings >= 150000) return '✈️ Enough to fund a premium vacation in Southeast Asia!';
    if (savings >= 100000) return '🏡 Enough to pay your entire household electricity bill for 2 years!';
    if (savings >= 60000) return '🛵 Enough to buy a brand new electric scooter!';
    if (savings >= 30000) return '🔋 Enough to pay for 15,000 km of free public fast charging!';
    return '☕ Enough to buy 150 premium coffees!';
  }

  get iphoneEquivalent(): string {
    const count = this.annualSavings / 80000;
    if (count < 0.1) return '0';
    if (count < 1) {
      return `${Math.round(count * 10) / 10} of an iPhone 16`;
    }
    return `${Math.floor(count)} iPhone 16${Math.floor(count) > 1 ? 's' : ''}`;
  }

  get annualPetrolCo2(): number {
    return Math.round((this.dailyCommute * 365 * 130) / 1000);
  }

  get annualDieselCo2(): number {
    return Math.round((this.dailyCommute * 365 * 145) / 1000);
  }

  get annualCngCo2(): number {
    return Math.round((this.dailyCommute * 365 * 95) / 1000);
  }

  get equivalentTreesPlanted(): number {
    return Math.round(this.annualPetrolCo2 / 22);
  }

  getTreesArray(): number[] {
    const count = Math.max(1, Math.min(24, Math.round(this.equivalentTreesPlanted)));
    return Array(count).fill(0);
  }

  getEmissionsPercent(val: number): number {
    const maxVal = Math.max(1, this.annualDieselCo2);
    return Math.round((val / maxVal) * 100);
  }

  // ==========================================
  // CHARGING CALCULATOR LOGIC
  // ==========================================
  chargeBatterySize = 40;
  chargingMode: 'AC' | 'DC' = 'DC';
  selectedChargerSpeed = 120;
  selectedPresetSize = 0;
  startSoc = 20;
  targetSoc = 80;
  isSimulating = false;
  simulationPercent = 20;
  simulationInterval: any = null;

  popularEvPresets = [
    { name: 'Custom Capacity (Slide below)', size: 0 },
    { name: 'Tata Tiago EV (19.2 kWh)', size: 19.2 },
    { name: 'Tata Punch EV / Citroen eC3 (25 kWh)', size: 25 },
    { name: 'Tata Nexon EV MR (30 kWh)', size: 30 },
    { name: 'Tata Nexon EV LR / MG Windsor EV (38 kWh)', size: 38 },
    { name: 'MG ZS EV / BYD Atto 3 (50.3 kWh)', size: 50.3 },
    { name: 'BYD Seal / Hyundai Ioniq 5 (82.5 kWh)', size: 82.5 }
  ];

  getVehicleMaxDc(size: number): number {
    if (size <= 20) return 22; // Tiago EV
    if (size <= 26) return 25; // Punch EV
    if (size <= 32) return 30; // Nexon EV MR
    if (size <= 39) return 45; // Windsor EV / Nexon EV LR
    if (size <= 61) return 80; // ZS EV / Atto 3
    return 150; // Premium EVs like Seal/Ioniq 5
  }

  get isBottlenecked(): boolean {
    if (this.selectedChargerSpeed < 50) return false; // AC charging has no DC bottleneck
    const maxDc = this.getVehicleMaxDc(this.chargeBatterySize);
    return maxDc < this.selectedChargerSpeed;
  }

  applyPresetSize() {
    const size = Number(this.selectedPresetSize);
    if (size > 0) {
      this.chargeBatterySize = size;
    }
    this.stopSimulation();
    this.cdr.detectChanges();
  }

  onCustomBatteryChange() {
    this.selectedPresetSize = 0; // Set preset to Custom
    this.stopSimulation();
    this.cdr.detectChanges();
  }

  onChargingModeChange(mode: 'AC' | 'DC') {
    this.chargingMode = mode;
    if (mode === 'AC') {
      if (this.selectedChargerSpeed > 22) {
        this.selectedChargerSpeed = 7.2; // Default to a standard AC value
      }
    } else {
      if (this.selectedChargerSpeed <= 22) {
        this.selectedChargerSpeed = 120; // Default to a standard DC value
      }
    }
    this.stopSimulation();
    this.cdr.detectChanges();
  }

  onChargerSpeedChange() {
    this.stopSimulation();
    this.cdr.detectChanges();
  }

  get calculatedChargeTime(): string {
    const batterySize = this.chargeBatterySize;
    const speed = this.selectedChargerSpeed;
    const maxDc = this.getVehicleMaxDc(batterySize);
    const effectiveKw = speed >= 50 ? Math.min(speed, maxDc) : speed;

    const start = this.startSoc;
    const target = this.targetSoc;
    if (start >= target) return '0 min';

    let hours = 0;

    if (speed < 50) {
      // AC charging (efficiency 90% conversion)
      const netKwh = batterySize * (target - start) / 100;
      hours = netKwh / (effectiveKw * 0.9);
    } else {
      // DC charging (battery curve: fast below 80%, throttled above 80%)
      const z1Start = start;
      const z1End = Math.min(80, target);
      if (z1End > z1Start) {
        const z1Kwh = batterySize * (z1End - z1Start) / 100;
        hours += z1Kwh / (effectiveKw * 0.85); // 85% charging speed
      }

      const z2Start = Math.max(80, start);
      const z2End = target;
      if (z2End > z2Start) {
        const z2Kwh = batterySize * (z2End - z2Start) / 100;
        hours += z2Kwh / (effectiveKw * 0.2); // throttles down to 20% intake speed
      }
    }

    const totalMinutes = Math.round(hours * 60);
    const displayHours = Math.floor(totalMinutes / 60);
    const displayMins = totalMinutes % 60;

    if (displayHours === 0) {
      return `${displayMins} Mins`;
    }
    return `${displayHours} hr ${displayMins} min`;
  }

  get rangeAdded(): number {
    const currentLevel = this.isSimulating ? this.simulationPercent : this.targetSoc;
    const netKwh = this.chargeBatterySize * (currentLevel - this.startSoc) / 100;
    return Math.max(0, Math.round(netKwh * 7.5)); // Average real-world efficiency of 7.5 km/kWh
  }

  getBatteryFillPercent(): number {
    return this.isSimulating ? this.simulationPercent : this.targetSoc;
  }

  getBatteryFillColor(): string {
    const current = this.getBatteryFillPercent();
    if (current < 30) {
      return 'linear-gradient(90deg, #EA580C, #F97316)'; // Warm Orange/Amber
    } else if (current < 80) {
      return 'linear-gradient(90deg, #0284C7, #38BDF8)'; // Electric Blue
    } else {
      return 'linear-gradient(90deg, #059669, #10B981)'; // Emerald Green
    }
  }

  toggleSimulation() {
    if (this.isSimulating) {
      this.stopSimulation();
    } else {
      this.startSimulation();
    }
  }

  startSimulation() {
    this.isSimulating = true;
    this.simulationPercent = this.startSoc;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
    
    const steps = this.targetSoc - this.startSoc;
    const intervalMs = Math.max(40, Math.min(120, 3000 / steps)); // target roughly 3 seconds simulation

    this.simulationInterval = setInterval(() => {
      if (this.simulationPercent < this.targetSoc) {
        this.simulationPercent++;
        this.cdr.detectChanges();
      } else {
        this.stopSimulation();
      }
    }, intervalMs);
  }

  getOptimizedUrl(url: string | undefined | null, width?: number): string {
    return getOptimizedImageUrl(url, width);
  }

  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isSimulating = false;
    this.cdr.detectChanges();
  }

  onStartSocChange() {
    if (this.startSoc >= this.targetSoc) {
      this.targetSoc = Math.min(100, this.startSoc + 5);
    }
    this.stopSimulation();
    this.cdr.detectChanges();
  }

  onTargetSocChange() {
    if (this.targetSoc <= this.startSoc) {
      this.startSoc = Math.max(0, this.targetSoc - 5);
    }
    this.stopSimulation();
    this.cdr.detectChanges();
  }

  get chargingVerdict(): string {
    const speed = this.selectedChargerSpeed;
    const maxDc = this.getVehicleMaxDc(this.chargeBatterySize);
    
    if (speed === 3.3) {
      return '🔌 Slow AC charging. Perfect for overnight home charging, keeping your battery healthy over years of ownership.';
    } else if (speed === 7.2) {
      return '⚡ Standard AC Fast Wallbox. Fully charges most family EVs overnight in 4 to 6 hours. The gold standard for home use.';
    } else if (speed === 50) {
      if (maxDc < 50) {
        return `⚠️ Highway DC charging. Note: Your car intakes maximum ${maxDc} kW, so charging is throttled to vehicle speed.`;
      }
      return '🌀 Highway DC Fast Charger. Charges from 10% to 80% in about 40–50 minutes. Ideal for standard highway coffee breaks.';
    } else {
      if (maxDc < 120) {
        return `⚠️ Ultra-Fast DC charging. Note: Your car is bottlenecked at ${maxDc} kW, so a 120 kW charger will charge at capped speed.`;
      }
      return '🚀 Ultra-Fast DC Charger. Blazes from 10% to 80% in under 30 minutes (if supported by vehicle intake). Perfect for quick stops.';
    }
  }

  onCommuteChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.dailyCommute = Number(input.value);
    this.cdr.detectChanges();
  }

  onElectricityRateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.electricityRate = Number(input.value);
    this.cdr.detectChanges();
  }

  onEvEfficiencyChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.evEfficiency = Number(input.value);
    this.cdr.detectChanges();
  }

  adjustPrice(val: number) {
    this.petrolPrice = Math.max(70, Math.min(150, this.petrolPrice + val));
    this.cdr.detectChanges();
  }

  adjustMileage(val: number) {
    this.petrolMileage = Math.max(5, Math.min(30, this.petrolMileage + val));
    this.cdr.detectChanges();
  }

  getBarHeight(cost: number): number {
    const maxVal = 25000; // Realistic max threshold for scaling bars
    return Math.max(8, Math.min(100, (cost / maxVal) * 100));
  }

  constructor(
    private dataService: BlogDataService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef,
    private http: HttpClient,
    private seoService: SeoService,
    private schemaService: SchemaService
  ) {}

  ngOnInit() {
    this.seoService.updateSeo({
      title: 'Compare Electric Vehicles & Calculate Savings in India',
      description:
        'Compare electric cars in India, calculate EV savings against petrol, explore charging times, and discover the right EV on EVCorn — specs, range, and prices.'
    });

    this.schemaService.setSchema([
      this.schemaService.buildOrganization(),
      this.schemaService.buildWebSite(),
      this.schemaService.buildWebPage(
        'EVCorn — Compare Electric Vehicles in India',
        'Compare electric cars in India, calculate EV savings against petrol, explore charging times, and discover the right EV on EVCorn — specs, range, and prices.',
        '/'
      )
    ]);

    this.loadData();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (typeof document === 'undefined') return;
    const clickedInside = this.elementRef.nativeElement.querySelector('.search-bar-container')?.contains(event.target);
    if (!clickedInside) {
      this.clearSearch();
    }
  }

  private _parallaxRaf = 0;

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (typeof window === 'undefined') return;
    const clientX = event.clientX;
    const clientY = event.clientY;
    if (this._parallaxRaf) return;
    this._parallaxRaf = window.requestAnimationFrame(() => {
      this._parallaxRaf = 0;
      const hero = document.querySelector('.hero') as HTMLElement;
      if (!hero) return;
      const normalizedX = (clientX / window.innerWidth) - 0.5;
      const normalizedY = (clientY / window.innerHeight) - 0.5;
      hero.style.setProperty('--mx', `${normalizedX * -20}px`);
      hero.style.setProperty('--my', `${normalizedY * -20}px`);
    });
  }

  loadData() {
    this.articlesState = 'loading';

    // Single cached call for articles (light payload for home cards)
    this.dataService.getArticlesLight().subscribe({
      next: (articles) => {
        this.allArticlesList = (articles as Article[]) || [];
        this.latestArticles = (this.allArticlesList || [])
          .filter(a => a.active !== false)
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 3);
        this.articlesState = 'loaded';
        this.cdr.detectChanges();
      },
      error: () => {
        this.allArticlesList = [];
        this.latestArticles = [];
        // Distinct from "loaded" so a genuine backend failure shows a
        // retry-able error instead of silently looking like "no articles yet".
        this.articlesState = 'error';
        this.cdr.detectChanges();
      }
    });

    // Load categories from cached service
    this.dataService.getCategories().subscribe({
      next: (cats) => {
        this.categoriesList = cats || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.categoriesList = [];
        this.cdr.detectChanges();
      }
    });

    // Fetch vehicles for the EV Finder
    this.dataService.getVehiclesLight().subscribe({
      next: (vehicles) => {
        this.vehiclesList = vehicles || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.vehiclesList = [];
        this.cdr.detectChanges();
      }
    });
  }

  getArticleCount(categoryId: string): number {
    return this.allArticlesList
      .filter(a => a.categoryId === categoryId && a.active)
      .length;
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
  }

  clearSearch() {
    this.searchQuery = '';
  }

  get matchingBrands() {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) return [];
    return this.categoriesList.filter(c => c.name.toLowerCase().includes(query));
  }

  get matchingArticles() {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) return [];
    return this.allArticlesList.filter(a => 
      a.title.toLowerCase().includes(query) || 
      (a.description && a.description.toLowerCase().includes(query))
    );
  }

  formatRange(val: any): string {
    return formatCardRange(val);
  }

  formatBattery(val: any): string {
    return formatCardBattery(val);
  }
}
