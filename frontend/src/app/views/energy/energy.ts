import { Component, OnInit, OnDestroy } from '@angular/core';
import { SeoService } from '../../services/seo.service';
import { SchemaService } from '../../services/schema.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnergyConfig } from './energy-config';
import { LocationService } from '../../services/location.service';
import { Subscription } from 'rxjs';
import { GlobalLocationComponent } from '../../components/global-location/global-location.component';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-energy',
  standalone: true,
  imports: [CommonModule, FormsModule, GlobalLocationComponent, BreadcrumbComponent, RouterLink],
  template: `
    <div class="battery-page">
      <!-- Glow decoration elements -->
      <div class="glow-bg glow-cyan"></div>
      <div class="glow-bg glow-pink"></div>
      <div class="glow-bg glow-orange"></div>
      <div class="glow-bg glow-purple"></div>

      <!-- Hero Header -->
      <header class="battery-hero animate-premium-fade">
        <app-breadcrumb [paths]="[{label: 'Energy Hub', url: '/energy'}]"></app-breadcrumb>
        <div style="margin-top: 15px;"><span class="battery-badge">Green Energy</span></div>
        <h1>Charge Your EV for <span class="text-gradient-evcorn">₹0</span></h1>
        <p>Estimate the solar panels and home storage battery you need to run your home and drive your EV on 100% clean, self-generated power.</p>
      </header>

      <!-- Tab Navigation -->
      <div class="tabs-wrapper animate-premium-fade">
        <div class="tabs-container">
          <button class="tab-btn" [class.active]="activeTab === 'solar'" (click)="activeTab = 'solar'; calculateSolarAndBattery()">Solar + EV</button>
          <button class="tab-btn" [class.active]="activeTab === 'battery'" (click)="activeTab = 'battery'; calculateBatteryHub()">Home Battery</button>
          <button class="tab-btn" [class.active]="activeTab === 'bill'" (click)="activeTab = 'bill'; calculateOptimizer()">Bill Optimizer</button>
          <button class="tab-btn" [class.active]="activeTab === 'subsidy'" (click)="activeTab = 'subsidy'; calculateSubsidy()">Subsidy & Incentives</button>
        </div>
      </div>

      <!-- Solar Calculator Section -->
      <section class="calculator-grid animate-premium-fade" *ngIf="activeTab === 'solar'">
        <!-- Input Panel -->
        <div class="calc-panel inputs-panel">
          <div class="panel-header">
            <h2>1. Configuration</h2>
            <p>Fine-tune your daily energy requirements.</p>
          </div>

          <!-- Input Block 1: Commute -->
          <div class="input-group">
            <div class="input-header">
              <label for="commute">Daily EV Commute</label>
              <span class="unit-badge">km</span>
            </div>
            <div class="stepper-control">
              <button class="step-btn" (click)="stepCommute(-5)">−</button>
              <input type="number" [(ngModel)]="dailyCommute" (ngModelChange)="calculateSolarAndBattery()" class="num-input" />
              <button class="step-btn" (click)="stepCommute(5)">+</button>
            </div>
            <input type="range" id="commute" min="10" max="250" step="5" [(ngModel)]="dailyCommute" (ngModelChange)="calculateSolarAndBattery()" class="premium-slider" />
          </div>

          <!-- Input Block 2: Bill -->
          <div class="input-group">
            <div class="input-header">
              <label for="bill">Avg. Monthly Electricity Bill</label>
              <span class="unit-badge">₹</span>
            </div>
            <div class="stepper-control">
              <button class="step-btn" (click)="stepBill(-500)">−</button>
              <input type="number" [(ngModel)]="electricityBill" (ngModelChange)="calculateSolarAndBattery()" class="num-input" />
              <button class="step-btn" (click)="stepBill(500)">+</button>
            </div>
            <input type="range" id="bill" min="1000" max="25000" step="500" [(ngModel)]="electricityBill" (ngModelChange)="calculateSolarAndBattery()" class="premium-slider" />
          </div>

          <!-- Input Block 3: Tariff -->
          <div class="input-group">
            <div class="input-header">
              <label for="rate">Electricity Tariff Rate</label>
              <span class="unit-badge">₹/kWh</span>
            </div>
            <div class="stepper-control">
              <button class="step-btn" (click)="stepRate(-0.5)">−</button>
              <input type="number" [(ngModel)]="electricityRate" (ngModelChange)="calculateSolarAndBattery()" step="0.5" class="num-input" />
              <button class="step-btn" (click)="stepRate(0.5)">+</button>
            </div>
            <input type="range" id="rate" min="3" max="15" step="0.5" [(ngModel)]="electricityRate" (ngModelChange)="calculateSolarAndBattery()" class="premium-slider" />
          </div>

          <!-- Tech defaults -->
          <div class="tech-defaults">
            <details>
              <summary>System Assumptions</summary>
              <div class="defaults-grid">
                <div class="default-item">
                  <span>Petrol Price</span>
                  <strong>₹{{ EnergyConfig.petrolPrice }}/L</strong>
                </div>
                <div class="default-item">
                  <span>Petrol Mileage</span>
                  <strong>{{ EnergyConfig.petrolMileage }} km/L</strong>
                </div>
                <div class="default-item">
                  <span>EV Efficiency</span>
                  <strong>{{ EnergyConfig.evEfficiency }} km/kWh</strong>
                </div>
                <div class="default-item">
                  <span>Solar Cost</span>
                  <strong>₹{{ (EnergyConfig.solarCostPerKw/1000) }}k/kWp</strong>
                </div>
                <div class="default-item">
                  <span>Battery Cost</span>
                  <strong>₹{{ (EnergyConfig.batteryCostPerKwh/1000) }}k/kWh</strong>
                </div>
              </div>
            </details>
          </div>
        </div>

        <!-- Output Dashboard -->
        <div class="calc-panel outputs-panel">
          <div class="panel-header">
            <h2>2. Recommendation & Impact</h2>
            <p>Your path to zero-grid independence.</p>
          </div>

          <div class="metrics-grid">
            <!-- ROI Card -->
            <div class="metric-card card-premium">
              <div class="metric-icon">🚀</div>
              <div class="metric-info">
                <span class="metric-label">Break-even Point</span>
                <div class="metric-value-wrap">
                  <span class="metric-value">{{ roiYears | number:'1.1-1' }}</span>
                  <span class="metric-unit">Years</span>
                </div>
                <div class="metric-details-grid">
                  <div class="detail-box">
                    <span class="detail-val">₹{{ systemCost | number }}</span>
                    <span class="detail-lbl">Est. System Cost</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Savings Card -->
            <div class="metric-card card-green">
              <div class="metric-icon">💰</div>
              <div class="metric-info">
                <span class="metric-label">Estimated Savings</span>
                <div class="metric-value-wrap">
                  <span class="metric-unit">₹</span>
                  <span class="metric-value">{{ monthlySavings | number }}</span>
                  <span class="metric-unit">/ mo</span>
                </div>
                <div class="metric-details-grid">
                  <div class="detail-box">
                    <span class="detail-val">₹{{ (monthlySavings * 12) | number }}</span>
                    <span class="detail-lbl">Per Year</span>
                  </div>
                  <div class="detail-box highlight">
                    <span class="detail-val">₹{{ lifetimeSavings | number }}</span>
                    <span class="detail-lbl">25-Yr Lifetime</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Solar Card -->
            <div class="metric-card card-gold">
              <div class="metric-icon">☀️</div>
              <div class="metric-info">
                <span class="metric-label">Solar & Inverter Setup</span>
                <div class="metric-value-wrap">
                  <span class="metric-value">{{ solarCapacity | number:'1.1-1' }}</span>
                  <span class="metric-unit">kWp</span>
                </div>
                <div class="metric-details-grid">
                  <div class="detail-box">
                    <span class="detail-val">{{ panelCount }}</span>
                    <span class="detail-lbl">Panels (400W)</span>
                  </div>
                  <div class="detail-box">
                    <span class="detail-val">{{ inverterCapacity | number:'1.1-1' }} kW</span>
                    <span class="detail-lbl">Inverter Size</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Battery Card -->
            <div class="metric-card card-blue">
              <div class="metric-icon">🔋</div>
              <div class="metric-info">
                <span class="metric-label">Storage Buffer</span>
                <div class="metric-value-wrap">
                  <span class="metric-value">{{ batteryCapacity | number:'1.1-1' }}</span>
                  <span class="metric-unit">kWh</span>
                </div>
                <div class="metric-details-grid">
                  <div class="detail-box">
                    <span class="detail-val">LFP</span>
                    <span class="detail-lbl">Safe Chemistry</span>
                  </div>
                  <div class="detail-box">
                    <span class="detail-val">0-Grid</span>
                    <span class="detail-lbl">Target</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Carbon Card -->
            <div class="metric-card card-emerald">
              <div class="metric-icon">🌲</div>
              <div class="metric-info">
                <span class="metric-label">CO₂ Saved / Yr</span>
                <div class="metric-value-wrap">
                  <span class="metric-value">{{ (carbonOffset / 1000) | number:'1.1-2' }}</span>
                  <span class="metric-unit">Tons</span>
                </div>
                <div class="metric-details-grid">
                  <div class="detail-box">
                    <span class="detail-val">{{ Math.round(carbonOffset / 21) }}</span>
                    <span class="detail-lbl">Trees Planted</span>
                  </div>
                  <div class="detail-box">
                    <span class="detail-val">{{ equivalentCars | number:'1.1-1' }}</span>
                    <span class="detail-lbl">Cars Off Road</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="lead-cta">
            <button class="cta-btn" (click)="onCtaClick()">Get Structural Quote</button>
          </div>
        </div>
      </section>
      
      <!-- Home Battery Hub Section -->
      <section class="calculator-grid animate-premium-fade" *ngIf="activeTab === 'battery'">
        <!-- Inputs -->
        <div class="calc-panel inputs-panel">
          <div class="panel-header">
            <h2>1. Backup Requirements</h2>
            <p>Determine the battery capacity you need for peace of mind.</p>
          </div>

          <div class="input-group">
            <div class="input-header">
              <label>Average Home Load</label>
              <span class="unit-badge">kW</span>
            </div>
            <div class="stepper-control">
              <button class="step-btn" (click)="stepLoad(-0.5)">−</button>
              <input type="number" [(ngModel)]="homeLoadKw" (ngModelChange)="calculateBatteryHub()" class="num-input" step="0.5" />
              <button class="step-btn" (click)="stepLoad(0.5)">+</button>
            </div>
            <input type="range" min="0.5" max="15" step="0.5" [(ngModel)]="homeLoadKw" (ngModelChange)="calculateBatteryHub()" class="premium-slider" />
          </div>

          <div class="input-group">
            <div class="input-header">
              <label>Required Backup Hours</label>
              <span class="unit-badge">Hours</span>
            </div>
            <div class="stepper-control">
              <button class="step-btn" (click)="stepHours(-1)">−</button>
              <input type="number" [(ngModel)]="backupHours" (ngModelChange)="calculateBatteryHub()" class="num-input" />
              <button class="step-btn" (click)="stepHours(1)">+</button>
            </div>
            <input type="range" min="1" max="24" step="1" [(ngModel)]="backupHours" (ngModelChange)="calculateBatteryHub()" class="premium-slider" />
          </div>

          <div class="input-group toggle-group">
            <div class="input-header">
              <label>Do you have existing Solar?</label>
            </div>
            <div class="toggle-buttons">
              <button class="toggle-btn" [class.active]="hasSolar" (click)="hasSolar = true; calculateBatteryHub()">Yes</button>
              <button class="toggle-btn" [class.active]="!hasSolar" (click)="hasSolar = false; calculateBatteryHub()">No</button>
            </div>
          </div>
        </div>

        <!-- Outputs -->
        <div class="calc-panel outputs-panel">
          <div class="panel-header">
            <h2>2. Recommendation</h2>
            <p>Your ideal home backup solution.</p>
          </div>

          <div class="metrics-grid">
            <div class="metric-card card-premium">
              <div class="metric-icon">⚡</div>
              <div class="metric-info">
                <span class="metric-label">Recommended Capacity</span>
                <div class="metric-value-wrap">
                  <span class="metric-value">{{ recBatteryKwh | number:'1.1-1' }}</span>
                  <span class="metric-unit">kWh</span>
                </div>
                <div class="metric-details-grid">
                  <div class="detail-box">
                    <span class="detail-val">{{ estBackupDuration | number:'1.1-1' }} hrs</span>
                    <span class="detail-lbl">Est. Duration</span>
                  </div>
                  <div class="detail-box highlight">
                    <span class="detail-val">+20%</span>
                    <span class="detail-lbl">Buffer</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="metric-card card-blue">
              <div class="metric-icon">🔋</div>
              <div class="metric-info">
                <span class="metric-label">Ideal Chemistry</span>
                <div class="metric-value-wrap">
                  <span class="metric-value" style="font-size: 1.5rem;">{{ recChemistry }}</span>
                </div>
                <div class="metric-details-grid">
                  <div class="detail-box">
                    <span class="detail-val">{{ suitability }}</span>
                    <span class="detail-lbl">Suitability</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="metric-card card-green" style="grid-column: 1 / -1;">
              <div class="metric-icon">💰</div>
              <div class="metric-info">
                <span class="metric-label">Estimated Price Range</span>
                <div class="metric-value-wrap">
                  <span class="metric-unit">₹</span>
                  <span class="metric-value">{{ (estPriceMin / 100000) | number:'1.1-2' }}L - {{ (estPriceMax / 100000) | number:'1.1-2' }}L</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Comparison Table embedded inside outputs -->
          <div class="comparison-card">
            <h3>LFP vs Lead Acid</h3>
            <table>
              <tr><th>Feature</th><th>LFP (Lithium)</th><th>Lead Acid</th></tr>
              <tr><td>Lifespan</td><td>10-15 Years</td><td>3-5 Years</td></tr>
              <tr><td>Maintenance</td><td>Zero Maintenance</td><td>Requires Water</td></tr>
              <tr><td>Efficiency</td><td>High (~95%)</td><td>Low (~80%)</td></tr>
              <tr><td>Discharge</td><td>Up to 90%</td><td>Max 50%</td></tr>
            </table>
          </div>
        </div>
      </section>

      <!-- Electricity Bill Optimizer Section -->
      <section class="calculator-grid animate-premium-fade" *ngIf="activeTab === 'bill'">
        <!-- Inputs -->
        <div class="calc-panel inputs-panel">
          <div class="panel-header">
            <h2>1. Your Electricity Bill</h2>
            <p>Analyze your consumption and potential savings.</p>
          </div>

          <div class="input-group">
            <div class="input-header">
              <label>Monthly Electricity Bill</label>
              <span class="unit-badge">₹</span>
            </div>
            <div class="stepper-control">
              <button class="step-btn" (click)="stepOptBill(-500)">−</button>
              <input type="number" [(ngModel)]="optBill" (ngModelChange)="calculateOptimizer()" class="num-input" step="500" />
              <button class="step-btn" (click)="stepOptBill(500)">+</button>
            </div>
            <input type="range" min="500" max="25000" step="500" [(ngModel)]="optBill" (ngModelChange)="calculateOptimizer()" class="premium-slider" />
          </div>

          <div class="input-group">
            <div class="input-header">
              <label>Average Tariff Rate</label>
              <span class="unit-badge">₹/kWh</span>
            </div>
            <div class="stepper-control">
              <button class="step-btn" (click)="stepOptTariff(-0.5)">−</button>
              <input type="number" [(ngModel)]="optTariff" (ngModelChange)="calculateOptimizer()" class="num-input" step="0.5" />
              <button class="step-btn" (click)="stepOptTariff(0.5)">+</button>
            </div>
            <input type="range" min="2" max="15" step="0.5" [(ngModel)]="optTariff" (ngModelChange)="calculateOptimizer()" class="premium-slider" />
          </div>
          
          <div class="input-group">
            <div class="input-header">
              <label>State / Region</label>
            </div>
            <select class="num-input" style="width: 100%; font-size: 1.1rem; text-align: left; padding-left: 15px;">
              <option>Maharashtra</option>
              <option>Delhi</option>
              <option>Karnataka</option>
              <option>Tamil Nadu</option>
              <option>Gujarat</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        <!-- Outputs -->
        <div class="calc-panel outputs-panel">
          <div class="panel-header">
            <h2>2. Financial & Environmental Impact</h2>
            <p>Your current footprint and solar potential.</p>
          </div>

          <div class="metrics-grid">
            <div class="metric-card card-blue">
              <div class="metric-icon">⚡</div>
              <div class="metric-info">
                <span class="metric-label">Est. Consumption</span>
                <div class="metric-value-wrap">
                  <span class="metric-value">{{ optUnits | number }}</span>
                  <span class="metric-unit">kWh/mo</span>
                </div>
                <div class="metric-details-grid">
                  <div class="detail-box">
                    <span class="detail-val">₹{{ optYearlyCost | number }}</span>
                    <span class="detail-lbl">Yearly Cost</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="metric-card card-green">
              <div class="metric-icon">☀️</div>
              <div class="metric-info">
                <span class="metric-label">Potential Solar Savings</span>
                <div class="metric-value-wrap">
                  <span class="metric-unit">₹</span>
                  <span class="metric-value">{{ optSolarSavings | number }}</span>
                  <span class="metric-unit">/yr</span>
                </div>
                <div class="metric-details-grid">
                  <div class="detail-box highlight">
                    <span class="detail-val">₹{{ optSolarBatterySavings | number }}</span>
                    <span class="detail-lbl">With Battery</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Insight Card -->
          <div class="insight-card">
            <div class="insight-icon">💡</div>
            <div class="insight-content">
              <h3>Did you know?</h3>
              <p>You consume more electricity than <strong>~{{ optPercentile }}%</strong> of households in India.</p>
              <p>Your home generates approximately <strong>{{ (optEmissions / 1000) | number:'1.1-2' }} Tons</strong> of CO₂ emissions annually from grid reliance.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Subsidy Hub Section -->
      <div class="animate-premium-fade" *ngIf="activeTab === 'subsidy'">
        <section class="calculator-grid">
          <!-- Inputs -->
          <div class="calc-panel inputs-panel">
            <div class="panel-header">
              <h2>1. Subsidy Eligibility</h2>
              <p>Find out how much the government will cover.</p>
            </div>

            <div class="input-group">
              <div class="input-header">
                <label>State & Region Settings</label>
              </div>
              <app-global-location context="energy"></app-global-location>
              <p style="font-size: 0.8rem; color: #64748B; margin-top: 8px; line-height: 1.4;">
                Subsidy rules are calculated based on this location. Check the "Make default" box when changing if you want this to apply everywhere.
              </p>
            </div>

            <div class="input-group toggle-group">
              <div class="input-header">
                <label>Property Type</label>
              </div>
              <div class="toggle-buttons">
                <button class="toggle-btn" [class.active]="subPropertyType === 'Residential'" (click)="subPropertyType = 'Residential'; calculateSubsidy()">Residential</button>
                <button class="toggle-btn" [class.active]="subPropertyType === 'Commercial'" (click)="subPropertyType = 'Commercial'; calculateSubsidy()">Commercial</button>
              </div>
            </div>

            <div class="input-group toggle-group">
              <div class="input-header">
                <label>Rooftop Type</label>
              </div>
              <div class="toggle-buttons">
                <button class="toggle-btn" [class.active]="subRooftopType === 'Flat'" (click)="subRooftopType = 'Flat'; calculateSubsidy()">Flat</button>
                <button class="toggle-btn" [class.active]="subRooftopType === 'Sloped'" (click)="subRooftopType = 'Sloped'; calculateSubsidy()">Sloped</button>
              </div>
            </div>

            <div class="input-group">
              <div class="input-header">
                <label>Planned Solar Size</label>
                <span class="unit-badge">kW</span>
              </div>
              <div class="stepper-control">
                <button class="step-btn" (click)="stepSubSystemSize(-1)">−</button>
                <input type="number" [(ngModel)]="subSystemSize" (ngModelChange)="calculateSubsidy()" class="num-input" />
                <button class="step-btn" (click)="stepSubSystemSize(1)">+</button>
              </div>
              <input type="range" min="1" max="15" step="1" [(ngModel)]="subSystemSize" (ngModelChange)="calculateSubsidy()" class="premium-slider" />
            </div>
            
            <div class="input-group toggle-group">
              <div class="input-header">
                <label>Already own an EV?</label>
              </div>
              <div class="toggle-buttons">
                <button class="toggle-btn" [class.active]="subHasEV" (click)="subHasEV = true">Yes</button>
                <button class="toggle-btn" [class.active]="!subHasEV" (click)="subHasEV = false">No</button>
              </div>
            </div>
          </div>

          <!-- Outputs -->
          <div class="calc-panel outputs-panel">
            <div class="panel-header" style="display:flex; justify-content: space-between; align-items:flex-start;">
              <div>
                <h2>2. Subsidy Estimate</h2>
                <p>Your net out-of-pocket installation cost.</p>
              </div>
              <div class="status-badge" [ngClass]="{'status-green': subEligibilityStatus === 'Eligible ✅', 'status-red': subEligibilityStatus === 'Not Eligible ❌', 'status-yellow': subEligibilityStatus === 'Possibly Eligible ⚠️'}">
                {{ subEligibilityStatus }}
              </div>
            </div>

            <div class="metrics-grid">
              <div class="metric-card card-blue" style="grid-column: 1 / -1;">
                <div class="metric-info">
                  <span class="metric-label" style="text-align:center;">Estimated Net Cost After Subsidy</span>
                  <div class="metric-value-wrap" style="justify-content:center; margin-top: 10px;">
                    <span class="metric-unit" style="font-size: 2rem;">₹</span>
                    <span class="metric-value" style="font-size: 3.5rem;">{{ subNetCost | number }}</span>
                  </div>
                </div>
              </div>

              <div class="metric-card card-premium">
                <div class="metric-icon">💰</div>
                <div class="metric-info">
                  <span class="metric-label">Est. System Cost</span>
                  <div class="metric-value-wrap">
                    <span class="metric-unit">₹</span>
                    <span class="metric-value" style="font-size: 1.8rem;">{{ subSystemCost | number }}</span>
                  </div>
                </div>
              </div>

              <div class="metric-card card-green">
                <div class="metric-icon">🏛️</div>
                <div class="metric-info">
                  <span class="metric-label">Eligible Subsidy</span>
                  <div class="metric-value-wrap">
                    <span class="metric-unit">₹</span>
                    <span class="metric-value" style="font-size: 1.8rem;">{{ subEligibleSubsidy | number }}</span>
                  </div>
                </div>
              </div>

              <div class="metric-card card-gold">
                <div class="metric-icon">⏱️</div>
                <div class="metric-info">
                  <span class="metric-label">Payback Period</span>
                  <div class="metric-value-wrap">
                    <span class="metric-value" style="font-size: 1.8rem;">{{ subPaybackYears | number:'1.1-1' }}</span>
                    <span class="metric-unit">Years</span>
                  </div>
                </div>
              </div>

              <div class="metric-card card-emerald">
                <div class="metric-icon">📈</div>
                <div class="metric-info">
                  <span class="metric-label">25-Yr Savings</span>
                  <div class="metric-value-wrap">
                    <span class="metric-unit">₹</span>
                    <span class="metric-value" style="font-size: 1.8rem;">{{ (sub25YearSavings / 100000) | number:'1.1-2' }}L</span>
                  </div>
                </div>
              </div>
            </div>
            
            <p class="disclaimer-text">* Subsidies and policies change over time. These estimates are indicative based on standard central government schemes.</p>
          </div>
        </section>

        <!-- Subsidy Info Roadmap -->
        <section class="info-grid">
          <div class="calc-panel docs-panel">
            <div class="panel-header">
              <h2>Required Documents</h2>
              <p>Keep these handy for your application.</p>
            </div>
            <div class="docs-list">
              <div class="doc-item"><span>✅</span> Aadhaar Card</div>
              <div class="doc-item"><span>✅</span> PAN Card</div>
              <div class="doc-item"><span>✅</span> Recent Electricity Bill</div>
              <div class="doc-item"><span>✅</span> Property Ownership Proof</div>
              <div class="doc-item"><span>✅</span> Cancelled Cheque (if required)</div>
              <div class="doc-item"><span>✅</span> Passport Photo</div>
            </div>
          </div>
          
          <div class="calc-panel timeline-panel">
            <div class="panel-header">
              <h2>Application Timeline</h2>
              <p>The standard process for claiming subsidies.</p>
            </div>
            <div class="timeline">
              <div class="timeline-item"><div class="timeline-num">1</div> Choose a Certified Installer</div>
              <div class="timeline-item"><div class="timeline-num">2</div> Apply on National Portal</div>
              <div class="timeline-item"><div class="timeline-num">3</div> Technical Feasibility Inspection</div>
              <div class="timeline-item"><div class="timeline-num">4</div> System Installation & Testing</div>
              <div class="timeline-item"><div class="timeline-num">5</div> Discom Approval & Net Metering</div>
              <div class="timeline-item"><div class="timeline-num">6</div> Subsidy Credited to Bank Account</div>
            </div>
          </div>
        </section>
      </div>

      <!-- Related Content -->
      <section class="related-content-section animate-fade" style="margin-top: 60px; padding-top: 40px; border-top: 1px solid rgba(0,0,0,0.05); max-width: 1200px; margin: 60px auto 0 auto; position: relative; z-index: 1;">
        <h2 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 20px;">Explore More EV Tools</h2>
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
          <a routerLink="/evs" class="related-link-card" style="flex: 1; min-width: 280px; padding: 24px; background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); text-decoration: none; color: inherit; display: block;">
            <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; color: #0284C7;">Browse Electric Vehicles</h3>
            <p style="font-size: 0.9rem; color: #64748B;">Explore EV models by brand with price, range, and battery options.</p>
          </a>
          <a routerLink="/compare" class="related-link-card" style="flex: 1; min-width: 280px; padding: 24px; background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); text-decoration: none; color: inherit; display: block;">
            <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; color: #7952FF;">Compare Electric Vehicles</h3>
            <p style="font-size: 0.9rem; color: #64748B;">Find the right EV to pair with your new home energy system.</p>
          </a>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .related-link-card {
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .related-link-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.04);
    }

    .battery-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 50%, #f3e8ff 100%);
      color: #334155;
      padding: 120px 24px 80px 24px;
      position: relative;
      overflow: hidden;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* Soft Gradient blobs */
    .glow-bg {
      position: absolute;
      width: 500px;
      height: 500px;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.3;
      z-index: 0;
      pointer-events: none;
      animation: floatBlobs 20s infinite alternate ease-in-out;
    }
    .glow-cyan { top: 10%; left: -10%; background: #00D2FF; }
    .glow-pink { top: 35%; right: -10%; background: #FF007F; animation-delay: -5s; }
    .glow-orange { bottom: 10%; left: 10%; background: #FF7F00; animation-delay: -10s; }
    .glow-purple { bottom: 25%; right: 15%; background: #7952FF; animation-delay: -15s; }

    @keyframes floatBlobs {
      0% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(60px, -40px) scale(1.1); }
      100% { transform: translate(-40px, 50px) scale(0.9); }
    }

    .text-gradient-evcorn {
      background: linear-gradient(to right, #00D2FF 0%, #7952FF 35%, #FF007F 70%, #FF7F00 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: inline-block;
      font-weight: 900;
    }

    .battery-hero {
      position: relative;
      z-index: 1;
      max-width: 800px;
      margin: 0 auto 50px auto;
      text-align: center;
    }
    .battery-badge {
      display: inline-block;
      padding: 6px 18px;
      background: #F3E8FF;
      border: 1px solid #D8B4FE;
      border-radius: 30px;
      color: #7E22CE;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 20px;
      box-shadow: 0 4px 15px rgba(126, 34, 206, 0.1);
    }
    .battery-hero h1 {
      font-size: 3.5rem;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #0F172A;
      margin-bottom: 16px;
      line-height: 1.1;
    }
    .battery-hero p {
      font-size: 1.15rem;
      line-height: 1.6;
      color: #64748B;
    }

    /* Tabs */
    .tabs-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 40px;
      position: relative;
      z-index: 1;
    }
    .tabs-container {
      display: flex;
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 100px;
      padding: 6px;
      border: 1px solid rgba(0, 0, 0, 0.05);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
      flex-wrap: wrap;
      justify-content: center;
    }
    .tab-btn {
      padding: 12px 24px;
      border-radius: 100px;
      border: none;
      background: transparent;
      color: #64748B;
      font-size: 1.05rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      white-space: nowrap;
    }
    .tab-btn.active {
      background: #FFFFFF;
      color: #0F172A;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    }

    .calculator-grid {
      position: relative;
      z-index: 1;
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 30px;
    }
    .info-grid {
      position: relative;
      z-index: 1;
      max-width: 1200px;
      margin: 30px auto 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }
    .calc-panel {
      background: rgba(255, 255, 255, 0.75);
      border: 1px solid rgba(255, 255, 255, 1);
      border-radius: 24px;
      padding: 40px;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04), 0 2px 10px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
    }
    .panel-header {
      margin-bottom: 35px;
    }
    .panel-header h2 {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 8px;
    }
    .panel-header p {
      font-size: 0.95rem;
      color: #64748B;
    }

    .input-group {
      margin-bottom: 35px;
      background: rgba(255, 255, 255, 0.9);
      padding: 24px;
      border-radius: 16px;
      border: 1px solid rgba(0, 0, 0, 0.04);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.01);
    }
    .input-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .input-header label {
      font-size: 0.95rem;
      font-weight: 600;
      color: #334155;
    }
    .unit-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748B;
      background: #F1F5F9;
      padding: 4px 10px;
      border-radius: 6px;
    }

    .stepper-control {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }
    .step-btn {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      background: #F8FAFC;
      color: #475569;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .step-btn:hover {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #0F172A;
    }
    .step-btn:active {
      transform: scale(0.95);
    }
    .num-input {
      flex-grow: 1;
      height: 44px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      color: #0F172A;
      font-size: 1.4rem;
      font-weight: 800;
      text-align: center;
      -moz-appearance: textfield;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.01);
    }
    .num-input::-webkit-outer-spin-button,
    .num-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .num-input:focus {
      outline: none;
      border-color: #38BDF8;
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
    }

    .premium-slider {
      width: 100%;
      -webkit-appearance: none;
      height: 6px;
      border-radius: 3px;
      background: #E2E8F0;
      outline: none;
    }
    .premium-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #38BDF8;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(56, 189, 248, 0.4);
      transition: transform 0.1s;
    }
    .premium-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }

    .toggle-buttons {
      display: flex;
      gap: 10px;
    }
    .toggle-btn {
      flex: 1;
      padding: 12px;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      background: #F8FAFC;
      color: #475569;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .toggle-btn.active {
      background: #38BDF8;
      color: #FFFFFF;
      border-color: #38BDF8;
      box-shadow: 0 4px 10px rgba(56, 189, 248, 0.3);
    }

    .tech-defaults {
      margin-top: 10px;
    }
    .tech-defaults details {
      cursor: pointer;
    }
    .tech-defaults summary {
      font-size: 0.85rem;
      font-weight: 600;
      color: #64748B;
      user-select: none;
      padding-bottom: 10px;
    }
    .defaults-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 10px;
      background: #F8FAFC;
      padding: 16px;
      border-radius: 12px;
      cursor: default;
      border: 1px solid #E2E8F0;
    }
    .default-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.8rem;
    }
    .default-item span {
      color: #64748B;
    }
    .default-item strong {
      color: #334155;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 35px;
      flex-grow: 1;
    }
    .metric-card {
      border-radius: 20px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(255, 255, 255, 1);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
    }
    .metric-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%);
      opacity: 0;
      transition: opacity 0.3s;
    }
    .metric-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.05);
    }
    .metric-card:hover::before {
      opacity: 1;
    }

    .metric-card.card-premium { border-color: #DDD6FE; background: linear-gradient(to bottom, #FFFFFF, #F5F3FF); }
    .metric-card.card-green { border-color: #A7F3D0; background: linear-gradient(to bottom, #FFFFFF, #ECFDF5); }
    .metric-card.card-gold { border-color: #FDE68A; background: linear-gradient(to bottom, #FFFFFF, #FFFBEB); }
    .metric-card.card-blue { border-color: #BAE6FD; background: linear-gradient(to bottom, #FFFFFF, #F0F9FF); }
    .metric-card.card-emerald { border-color: #99F6E4; background: linear-gradient(to bottom, #FFFFFF, #F0FDFA); }

    .metric-icon {
      font-size: 2rem;
      background: #FFFFFF;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      border: 1px solid #F1F5F9;
      box-shadow: 0 4px 10px rgba(0,0,0,0.03);
    }
    .metric-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 1;
    }
    .metric-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .metric-value-wrap {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .metric-value {
      font-size: 2.5rem;
      font-weight: 900;
      color: #0F172A;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }
    .metric-unit {
      font-size: 1.1rem;
      font-weight: 600;
      color: #64748B;
    }

    /* Detail Grid inside Cards */
    .metric-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #F1F5F9;
    }
    .detail-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .detail-val {
      font-size: 1.1rem;
      font-weight: 800;
      color: #334155;
    }
    .detail-lbl {
      font-size: 0.75rem;
      color: #94A3B8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .detail-box.highlight .detail-val {
      color: #10B981; /* Emerald Green */
    }

    .comparison-card {
      margin-top: 20px;
      background: rgba(255,255,255,0.9);
      border: 1px solid rgba(0,0,0,0.05);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
    }
    .comparison-card h3 {
      font-size: 1.1rem;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 15px;
    }
    .comparison-card table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .comparison-card th {
      text-align: left;
      padding: 10px;
      color: #64748B;
      border-bottom: 1px solid #E2E8F0;
    }
    .comparison-card td {
      padding: 12px 10px;
      color: #334155;
      border-bottom: 1px solid #F1F5F9;
    }
    .comparison-card tr:last-child td {
      border-bottom: none;
    }
    
    .insight-card {
      margin-top: 20px;
      background: linear-gradient(to right, rgba(56, 189, 248, 0.1), rgba(139, 92, 246, 0.1));
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      gap: 20px;
      align-items: center;
    }
    .insight-icon {
      font-size: 2.5rem;
      flex-shrink: 0;
    }
    .insight-content h3 {
      color: #0F172A;
      margin-bottom: 8px;
      font-weight: 800;
    }
    .insight-content p {
      color: #334155;
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 4px;
    }
    .insight-content p:last-child {
      margin-bottom: 0;
    }

    .lead-cta {
      display: flex;
      justify-content: center;
      margin-top: auto;
    }
    .cta-btn {
      width: 100%;
      background: linear-gradient(135deg, #00D2FF 0%, #3A7BD5 100%);
      color: #ffffff;
      border: none;
      padding: 16px 24px;
      border-radius: 14px;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 10px 25px rgba(0, 210, 255, 0.25);
    }
    .cta-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 35px rgba(0, 210, 255, 0.35);
    }
    .cta-btn:active {
      transform: scale(0.98);
    }

    /* Subsidy Hub specifics */
    .status-badge {
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 800;
      font-size: 0.95rem;
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    }
    .status-green { background: #ECFDF5; color: #10B981; border: 1px solid #A7F3D0; }
    .status-red { background: #FEF2F2; color: #EF4444; border: 1px solid #FECACA; }
    .status-yellow { background: #FFFBEB; color: #F59E0B; border: 1px solid #FDE68A; }

    .disclaimer-text {
      font-size: 0.8rem;
      color: #94A3B8;
      text-align: center;
      margin-top: 20px;
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-top: 20px;
    }
    .timeline-item {
      display: flex;
      align-items: center;
      gap: 15px;
      background: #F8FAFC;
      padding: 12px;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      font-weight: 600;
      color: #334155;
    }
    .timeline-num {
      width: 30px;
      height: 30px;
      background: #38BDF8;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      flex-shrink: 0;
    }
    .docs-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 20px;
    }
    .doc-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      color: #334155;
      background: #F8FAFC;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid #E2E8F0;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .calculator-grid { grid-template-columns: 1fr; }
      .info-grid { grid-template-columns: 1fr; }
      .metrics-grid { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    }
    @media (max-width: 768px) {
      .calculator-grid { gap: 20px; width: 100%; max-width: 100%; }
      .calc-panel { padding: 20px; width: 100%; box-sizing: border-box; }
      .input-group { padding: 15px; width: 100%; box-sizing: border-box; }
      
      .tabs-container {
        justify-content: flex-start;
        overflow-x: auto;
        padding-bottom: 5px;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
      }
      .tabs-container::-webkit-scrollbar { display: none; }
      .tab-btn { flex-shrink: 0; scroll-snap-align: start; }
      .battery-hero h1 { font-size: 2.2rem; }
      .metric-value { font-size: 2rem; }
      .insight-card { flex-direction: column; text-align: center; }
      .docs-list { grid-template-columns: 1fr; }
      .metrics-grid { grid-template-columns: 1fr; gap: 15px; }
      .metric-details-grid { grid-template-columns: 1fr; }
      .toggle-buttons { flex-direction: column; }
      .defaults-grid { grid-template-columns: 1fr; }
      .comparison-card { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .num-input { min-width: 0; width: 100%; }
    }
  `]
})
export class EnergyComponent implements OnInit {
  activeTab: 'solar' | 'battery' | 'bill' | 'subsidy' = 'solar';

  // Solar Tab Inputs
  electricityBill: number = 5000; 
  dailyCommute: number = 60; 
  electricityRate: number = 8.0; 
  
  // Solar Tab Outputs
  solarCapacity: number = 0; 
  batteryCapacity: number = 0; 
  monthlySavings: number = 0; 
  carbonOffset: number = 0; 
  systemCost: number = 0;
  roiYears: number = 0;
  inverterCapacity: number = 0;
  panelCount: number = 0;
  lifetimeSavings: number = 0;
  equivalentCars: number = 0;

  // Battery Tab Inputs
  homeLoadKw: number = 2.0;
  backupHours: number = 4;
  hasSolar: boolean = false;

  // Battery Tab Outputs
  recBatteryKwh: number = 0;
  estBackupDuration: number = 0;
  recChemistry: string = 'Lead Acid';
  estPriceMin: number = 0;
  estPriceMax: number = 0;
  suitability: string = 'Apartment';
  
  // Bill Optimizer Tab Inputs
  optBill: number = 2500;
  optTariff: number = 8.0;

  // Bill Optimizer Tab Outputs
  optUnits: number = 0;
  optYearlyCost: number = 0;
  optSolarSavings: number = 0;
  optSolarBatterySavings: number = 0;
  optEmissions: number = 0;
  optPercentile: number = 0;

  // Subsidy Tab Inputs
  subState: string = 'Maharashtra';
  subPropertyType: string = 'Residential';
  subRooftopType: string = 'Flat';
  subSystemSize: number = 3;
  subHasEV: boolean = false;

  // Subsidy Tab Outputs
  subSystemCost: number = 0;
  subEligibleSubsidy: number = 0;
  subNetCost: number = 0;
  subAnnualSavings: number = 0;
  sub25YearSavings: number = 0;
  subPaybackYears: number = 0;
  subEligibilityStatus: 'Eligible ✅' | 'Possibly Eligible ⚠️' | 'Not Eligible ❌' = 'Eligible ✅';

  Math = Math;
  EnergyConfig = EnergyConfig;
  private locSub: Subscription | null = null;

  constructor(
    private seoService: SeoService,
    private schemaService: SchemaService,
    private locationService: LocationService
  ) {}

  ngOnInit() {
    this.seoService.updateSeo({
      title: 'Solar EV Charging Calculator — Charge for ₹0',
      description:
        'Calculate the solar panel and battery capacity required to charge your EV for free in India. Estimate monthly savings, subsidy impact, and carbon offset on EVCorn.',
      url: '/energy'
    });

    this.schemaService.setSchema([
      this.schemaService.buildBreadcrumbs([
        { name: 'Home', url: '/' },
        { name: 'Energy Hub', url: '/energy' }
      ]),
      this.schemaService.buildWebPage(
        'Solar EV Charging Calculator',
        'Calculate the solar panel and battery capacity required to charge your electric vehicle for free in India.',
        '/energy'
      )
    ]);
    
    this.locSub = this.locationService.getLocationForModule('energy').subscribe(loc => {
      if (loc) {
        this.subState = loc.state;
        this.calculateSubsidy();
      }
    });

    this.calculateSolarAndBattery();
    this.calculateBatteryHub();
    this.calculateOptimizer();
    this.calculateSubsidy();
  }

  ngOnDestroy() {
    if (this.locSub) this.locSub.unsubscribe();
  }

  // Solar Stepper controls
  stepCommute(amount: number) {
    this.dailyCommute = Math.max(0, Math.min(500, this.dailyCommute + amount));
    this.calculateSolarAndBattery();
  }
  stepBill(amount: number) {
    this.electricityBill = Math.max(0, Math.min(100000, this.electricityBill + amount));
    this.calculateSolarAndBattery();
  }
  stepRate(amount: number) {
    this.electricityRate = Math.max(1, Math.min(50, parseFloat((this.electricityRate + amount).toFixed(1))));
    this.calculateSolarAndBattery();
  }

  // Battery Stepper controls
  stepLoad(amount: number) {
    this.homeLoadKw = Math.max(0.5, Math.min(15, parseFloat((this.homeLoadKw + amount).toFixed(1))));
    this.calculateBatteryHub();
  }
  stepHours(amount: number) {
    this.backupHours = Math.max(1, Math.min(24, this.backupHours + amount));
    this.calculateBatteryHub();
  }
  
  // Optimizer Stepper controls
  stepOptBill(amount: number) {
    this.optBill = Math.max(500, Math.min(50000, this.optBill + amount));
    this.calculateOptimizer();
  }
  stepOptTariff(amount: number) {
    this.optTariff = Math.max(2, Math.min(25, parseFloat((this.optTariff + amount).toFixed(1))));
    this.calculateOptimizer();
  }

  // Subsidy Stepper controls
  stepSubSystemSize(amount: number) {
    this.subSystemSize = Math.max(1, Math.min(15, this.subSystemSize + amount));
    this.calculateSubsidy();
  }

  calculateSolarAndBattery() {
    const evDailyKwh = this.dailyCommute / EnergyConfig.evEfficiency;
    const homeDailyKwh = this.electricityBill / (30 * this.electricityRate);
    const totalDailyKwh = evDailyKwh + homeDailyKwh;
    
    this.solarCapacity = parseFloat(((totalDailyKwh * 0.85) / 4.5).toFixed(1));
    this.panelCount = Math.ceil(this.solarCapacity * 1000 / 400); 
    this.inverterCapacity = Math.ceil(this.solarCapacity * 0.9); 
    this.batteryCapacity = parseFloat((homeDailyKwh * 0.5 + evDailyKwh).toFixed(1));

    const monthlyPetrolSaved = (this.dailyCommute * 30 / EnergyConfig.petrolMileage) * EnergyConfig.petrolPrice;
    const monthlyGridOffset = this.electricityBill * 0.85;
    this.monthlySavings = Math.round(monthlyPetrolSaved + monthlyGridOffset);
    
    const yearlySavings = this.monthlySavings * 12;
    this.lifetimeSavings = yearlySavings * 25; 

    const yearlySolarKwh = totalDailyKwh * 365;
    const yearlyPetrolLitresSaved = (this.dailyCommute * 365) / EnergyConfig.petrolMileage;
    
    const gridOffset = yearlySolarKwh * 0.82;
    const petrolOffset = yearlyPetrolLitresSaved * 2.3;
    this.carbonOffset = Math.round(gridOffset + petrolOffset);
    
    this.equivalentCars = parseFloat((this.carbonOffset / 4600).toFixed(1)); 

    this.systemCost = (this.solarCapacity * EnergyConfig.solarCostPerKw) + (this.batteryCapacity * EnergyConfig.batteryCostPerKwh);
    this.roiYears = yearlySavings > 0 ? parseFloat((this.systemCost / yearlySavings).toFixed(1)) : 0;
  }

  calculateBatteryHub() {
    this.recBatteryKwh = parseFloat((this.homeLoadKw * this.backupHours * EnergyConfig.bufferMargin).toFixed(1));
    this.estBackupDuration = parseFloat((this.recBatteryKwh / this.homeLoadKw).toFixed(1));

    if (this.backupHours > 4 || this.hasSolar) {
      this.recChemistry = 'LFP (Lithium)';
      this.estPriceMin = this.recBatteryKwh * EnergyConfig.lfpPricePerKwhMin;
      this.estPriceMax = this.recBatteryKwh * EnergyConfig.lfpPricePerKwhMax;
    } else {
      this.recChemistry = 'Lead Acid';
      this.estPriceMin = this.recBatteryKwh * EnergyConfig.leadAcidPricePerKwhMin;
      this.estPriceMax = this.recBatteryKwh * EnergyConfig.leadAcidPricePerKwhMax;
    }

    if (this.recBatteryKwh <= EnergyConfig.apartmentMaxKwh) {
      this.suitability = 'Apartment';
    } else if (this.recBatteryKwh <= EnergyConfig.houseMaxKwh) {
      this.suitability = 'House / Villa';
    } else {
      this.suitability = 'Small Business';
    }
  }
  
  calculateOptimizer() {
    this.optUnits = Math.round(this.optBill / this.optTariff);
    this.optYearlyCost = this.optBill * 12;
    this.optSolarSavings = Math.round(this.optYearlyCost * EnergyConfig.solarOffsetPercentage);
    this.optSolarBatterySavings = Math.round(this.optYearlyCost * EnergyConfig.solarBatteryOffsetPercentage);
    
    this.optEmissions = this.optUnits * 12 * EnergyConfig.gridEmissionFactor;

    const ratio = this.optUnits / EnergyConfig.nationalAverageMonthlyKwh;
    if (ratio <= 1) {
      this.optPercentile = Math.max(10, Math.round(ratio * 50));
    } else {
      this.optPercentile = Math.min(99, Math.round(50 + ((ratio - 1) * 15)));
    }
  }

  calculateSubsidy() {
    this.subSystemCost = this.subSystemSize * EnergyConfig.solarCostPerKw;

    if (this.subPropertyType === 'Commercial') {
      this.subEligibleSubsidy = EnergyConfig.commercialSubsidy;
      this.subEligibilityStatus = 'Not Eligible ❌';
    } else {
      let calcSubsidy = 0;
      if (this.subSystemSize <= 2) {
        calcSubsidy = this.subSystemSize * EnergyConfig.subsidyTier1PerKw;
      } else {
        calcSubsidy = (2 * EnergyConfig.subsidyTier1PerKw) + ((this.subSystemSize - 2) * EnergyConfig.subsidyTier2PerKw);
      }
      this.subEligibleSubsidy = Math.min(calcSubsidy, EnergyConfig.maxSubsidyCap);

      if (this.subRooftopType === 'Sloped') {
        this.subEligibilityStatus = 'Possibly Eligible ⚠️';
      } else {
        this.subEligibilityStatus = 'Eligible ✅';
      }
    }

    this.subNetCost = this.subSystemCost - this.subEligibleSubsidy;

    // Estimate savings based on size
    const monthlyUnitsGenerated = this.subSystemSize * 120; // 4 units/kW/day approx
    this.subAnnualSavings = monthlyUnitsGenerated * 8.0 * 12; // Assuming 8 INR tariff
    this.sub25YearSavings = this.subAnnualSavings * 25;
    
    this.subPaybackYears = this.subAnnualSavings > 0 ? parseFloat((this.subNetCost / this.subAnnualSavings).toFixed(1)) : 0;
  }

  onCtaClick() {
    alert('Thank you for your interest! In the future, this will open a local partner network matching form to fetch certified solar installation quotes for your region.');
  }
}
