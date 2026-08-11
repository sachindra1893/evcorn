import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { BlogDataService, Category, Article, CarSpec } from '../../services/blog-data.service';
import { AuthService } from '../../services/auth.service';
import { BlockEditorComponent } from '../../components/block-editor/block-editor.component';
import { BlockRendererComponent } from '../../components/block-renderer/block-renderer.component';
import { ArticleBlock } from '../../models/blocks.model';
import {
  assertArticleUpdateTarget,
  hydrateArticleBlocks,
  resolveArticleId,
  upsertArticleInList
} from './article-edit.util';
import {
  articleHasUploadingImages,
  assertNoLocalPreviewImages,
  uploadCoverIfDataUrl,
  uploadDataImagesInBlocks
} from '../../utils/article-image-upload.util';
import { normalizeArticleRelationships } from '../../entity';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, CommonModule, BlockEditorComponent, BlockRendererComponent],
  template: `
    <div class="admin-page">
      <h2>EVCorn Admin Portal</h2>

      <!-- Tab Switcher Navigation -->
      <div class="admin-tabs">
        <button [class.active]="activeTab === 'articles'" (click)="setTab('articles')">📰 Manage Articles</button>
        <button [class.active]="activeTab === 'vehicles'" (click)="setTab('vehicles')">🚗 Manage EV Specs</button>
        <button [class.active]="activeTab === 'brands'" (click)="setTab('brands')">🏷️ Manage Brands</button>
      </div>

      <div class="dashboard-content">
        
        <!-- ========================================== -->
        <!-- TAB 1: ARTICLES MANAGEMENT                 -->
        <!-- ========================================== -->
        <div *ngIf="activeTab === 'articles'" class="dashboard-grid">
          <!-- Article Form -->
          <div class="panel article-panel">
            <h3>{{ (articleEditMode || editingArticleId) ? 'Edit Article' : 'Write New EV Article' }}</h3>
            
            <form (submit)="onPublishArticle($event)" class="vertical-form">
              <div class="form-group">
                <label for="title">Article Title</label>
                <input 
                  type="text" 
                  id="title" 
                  name="title" 
                  placeholder="e.g. BYD Seal: Setting New Range Standards in 2025" 
                  [(ngModel)]="articleTitle"
                  required
                >
              </div>

              <div class="form-group">
                <label for="imageFile">Cover Photo</label>
                <div class="image-upload-wrapper" style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                  <input 
                    type="file" 
                    id="imageFile" 
                    accept="image/*" 
                    (change)="onImageFileSelected($event)" 
                    style="display: none;" 
                    #fileInput
                  >
                  <button type="button" class="btn secondary-btn upload-trigger-btn" (click)="fileInput.click()" style="padding: 10px 16px; background: #E2E8F0; color: #2D3748; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">
                    📁 Choose Image File
                  </button>
                  <span class="file-name-hint" style="color: #718096; font-size: 0.85rem;" *ngIf="selectedFileName">{{ selectedFileName }}</span>
                </div>
                
                <!-- Image Preview -->
                <div class="image-preview-container" *ngIf="articleImageUrl" style="position: relative; width: 100%; max-width: 250px; margin-top: 10px;">
                  <img [src]="articleImageUrl" class="image-preview" alt="Cover Preview" style="width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 8px; border: 1px solid rgba(0,0,0,0.06);">
                  <button type="button" class="btn delete-preview-btn" (click)="clearImagePreview()" style="margin-top: 6px; padding: 6px 12px; background: #FF4D4D; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: 600;">Remove Photo</button>
                </div>
                
                <p class="form-hint" *ngIf="imageProcessing" style="color: #0088CC; font-size: 0.85rem; margin-top: 5px;">Processing and compressing image...</p>
              </div>

              <!-- Editorial Relationships (Phase 7.4) -->
              <div class="admin-form-card">
                <div class="admin-card-header" (click)="adminSecRelationships = !adminSecRelationships">
                  <h4>🔗 Editorial Relationships (Phase 7.4)</h4>
                  <span class="card-toggle">{{ adminSecRelationships ? '▲' : '▼' }}</span>
                </div>
                <div class="admin-card-body" *ngIf="adminSecRelationships">
                  <div class="form-group">
                    <label for="rel-vehicles">Related Vehicle IDs (comma-separated)</label>
                    <input 
                      type="text" 
                      id="rel-vehicles" 
                      name="rel-vehicles" 
                      placeholder="e.g. tata-nexon-ev, mg-windsor-ev" 
                      [(ngModel)]="articleRelVehicles"
                      list="rel-vehicle-suggestions"
                      autocomplete="off"
                    >
                    <datalist id="rel-vehicle-suggestions">
                      @for (veh of vehicles; track veh.id) {
                        <option [value]="veh.id">{{ veh.name }} ({{ veh.id }})</option>
                      }
                    </datalist>
                    <p class="form-hint" style="color: #A8B2B2; font-size: 0.8rem; margin-top: 4px;">Connect this guide to specific EV variants.</p>
                  </div>

                  <div class="form-group">
                    <label for="rel-articles">Related Article IDs (comma-separated)</label>
                    <input 
                      type="text" 
                      id="rel-articles" 
                      name="rel-articles" 
                      placeholder="e.g. 66a2c..., 66a3f..." 
                      [(ngModel)]="articleRelArticles"
                      list="rel-article-suggestions"
                      autocomplete="off"
                    >
                    <datalist id="rel-article-suggestions">
                      @for (artItem of articles; track trackArticleId(artItem)) {
                        <option [value]="trackArticleId(artItem)">{{ artItem.title }}</option>
                      }
                    </datalist>
                    <p class="form-hint" style="color: #A8B2B2; font-size: 0.8rem; margin-top: 4px;">Connect this guide to related editorial stories.</p>
                  </div>

                  <div class="form-group">
                    <label for="rel-brands">Related Brand / Category IDs (comma-separated)</label>
                    <input 
                      type="text" 
                      id="rel-brands" 
                      name="rel-brands" 
                      placeholder="e.g. tata, mg, mahindra" 
                      [(ngModel)]="articleRelBrands"
                      list="rel-brand-suggestions"
                      autocomplete="off"
                    >
                    <datalist id="rel-brand-suggestions">
                      @for (cat of categories; track cat.id) {
                        <option [value]="cat.id">{{ cat.name }} ({{ cat.id }})</option>
                      }
                    </datalist>
                    <p class="form-hint" style="color: #A8B2B2; font-size: 0.8rem; margin-top: 4px;">Connect this guide to target EV brand categories.</p>
                  </div>
                </div>
              </div>

              <div class="form-group" style="margin-top: 20px;">
                <label>Article Content Blocks</label>
                <app-block-editor [(blocks)]="articleBlocks"></app-block-editor>
              </div>

              <div class="form-actions" style="margin-top: 25px;">
                <button type="submit" class="btn primary-btn" [disabled]="saving">
                  {{ saving ? 'Saving...' : ((articleEditMode || editingArticleId) ? 'Update Article' : 'Publish EV Article') }}
                </button>
                <button *ngIf="articleEditMode || editingArticleId" type="button" (click)="cancelEditArticle()" class="btn cancel-btn">
                  Cancel Edit
                </button>
              </div>
            </form>
          </div>

          <!-- Live Preview Pane -->
          <div class="panel preview-panel">
            <h3 style="display: flex; justify-content: space-between; align-items: center;">
              Live Preview 
              <span style="font-size: 0.8rem; font-weight: normal; background: #38bdf8; color: #0f172a; padding: 2px 8px; border-radius: 10px;">Auto-updating</span>
            </h3>
            <div class="preview-container" style="background: white; color: #333; padding: 20px; border-radius: 8px; max-height: 800px; overflow-y: auto; border: 1px solid #e2e8f0;">
              <h1 style="margin-top: 0; margin-bottom: 20px; font-size: 2rem; color: #111;">{{ articleTitle || 'Article Title Preview' }}</h1>
              <img *ngIf="articleImageUrl" [src]="articleImageUrl" style="width: 100%; border-radius: 8px; margin-bottom: 20px;" alt="Cover">
              <div *ngIf="!articleBlocks || articleBlocks.length === 0" style="color: #94a3b8; font-style: italic; text-align: center; margin-top: 40px;">
                Add content blocks on the left to see the live preview here.
              </div>
              <app-block-renderer [blocks]="articleBlocks"></app-block-renderer>
            </div>
          </div>
        </div>
        
        <div *ngIf="activeTab === 'articles'" style="margin-top: 20px;">
          <!-- Manage Articles List -->
          <div class="panel manage-panel">
            <h3>Manage Published Articles</h3>
            <div class="articles-list-wrapper">
              @if (articles.length > 0) {
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (art of articles; track trackArticleId(art)) {
                      <tr>
                        <td class="article-title">{{ art.title }}</td>
                        <td>
                          <span class="cat-label">News</span>
                        </td>
                        <td class="table-actions">
                          <button (click)="startEditArticle(art)" class="btn edit-btn">Edit</button>
                          <button (click)="onDeleteArticle(trackArticleId(art), art.title)" class="btn delete-btn">Delete</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else {
                <p class="no-articles">No articles published. Write one to populate the library!</p>
              }
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- TAB 2: VEHICLE SPECS MANAGEMENT            -->
        <!-- ========================================== -->
        <div *ngIf="activeTab === 'vehicles'" class="dashboard-grid">
          <!-- EV Specs Form -->
          <div class="panel article-panel">
            <h3>{{ editingVehicleId ? 'Edit Vehicle Specs' : 'Add Vehicle Specs' }}</h3>
            
            <form (submit)="onSaveVehicle($event)" class="vertical-form scrollable-form">
              <!-- Section 1: Overview & Pricing -->
              <div class="admin-form-card">
                <div class="admin-card-header" (click)="adminSecOverview = !adminSecOverview">
                  <h4>📌 1. Overview & Pricing</h4>
                  <span class="card-toggle">{{ adminSecOverview ? '▲' : '▼' }}</span>
                </div>
                <div class="admin-card-body" *ngIf="adminSecOverview">
                  <!-- Vehicle Lifecycle Status -->
                  <div class="form-group">
                    <label for="car-lifecycle-status">Vehicle Status</label>
                    <select id="car-lifecycle-status" name="car-lifecycle-status" [(ngModel)]="vehLifecycleStatus" (ngModelChange)="onLifecycleStatusChange($event)">
                      <option value="Launched">Launched</option>
                      <option value="Upcoming">Upcoming</option>
                    </select>
                  </div>

                  <!-- Brand / Category -->
                  <div class="form-group">
                    <label for="car-category">Brand / Category</label>
                    <input 
                      type="text" 
                      id="car-category" 
                      name="car-category" 
                      placeholder="e.g. Tata Motors" 
                      [(ngModel)]="vehBrandName"
                      (ngModelChange)="onFormBrandChange()"
                      list="brand-suggestions"
                      autocomplete="off"
                      required
                    >
                    <datalist id="brand-suggestions">
                      @for (cat of categories; track cat.id) {
                        <option [value]="cat.name"></option>
                      }
                    </datalist>
                  </div>

                  <!-- Model Name -->
                  <div class="form-group">
                    <label for="car-parent-model">Model Name</label>
                    <input 
                      type="text" 
                      id="car-parent-model" 
                      name="car-parent-model" 
                      placeholder="e.g. Nexon EV" 
                      [(ngModel)]="vehParentModel"
                      (ngModelChange)="onModelNameChange($event)"
                      list="model-suggestions"
                      autocomplete="off"
                      required
                    >
                    <datalist id="model-suggestions">
                      @for (model of getUniqueModelNames(vehCategoryId); track model) {
                        <option [value]="model"></option>
                      }
                    </datalist>
                  </div>

                  <!-- Variant -->
                  <div class="form-group">
                    <label for="car-variant-name">Variant Name</label>
                    <input 
                      type="text" 
                      id="car-variant-name" 
                      name="car-variant-name" 
                      placeholder="e.g. Empowered+ LR" 
                      [(ngModel)]="vehVariantName"
                      required
                    >
                  </div>

                  <!-- Launch Date / Expected Launch -->
                  <div class="form-group">
                    <label for="car-launch-date">{{ vehLifecycleStatus === 'Upcoming' ? 'Expected Launch' : 'Launch Date' }}</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <!-- Upcoming Period Dropdown -->
                      <select *ngIf="vehLifecycleStatus === 'Upcoming'" id="car-launch-period" name="car-launch-period" [(ngModel)]="vehLaunchPeriod" style="flex: 1;">
                        <option value="Early">Early</option>
                        <option value="Mid">Mid</option>
                        <option value="Late">Late</option>
                      </select>

                      <!-- Launched Month Dropdown -->
                      <select *ngIf="vehLifecycleStatus !== 'Upcoming'" id="car-launch-month" name="car-launch-month" [(ngModel)]="vehLaunchMonth" style="flex: 1;">
                        <option value="January">January</option>
                        <option value="February">February</option>
                        <option value="March">March</option>
                        <option value="April">April</option>
                        <option value="May">May</option>
                        <option value="June">June</option>
                        <option value="July">July</option>
                        <option value="August">August</option>
                        <option value="September">September</option>
                        <option value="October">October</option>
                        <option value="November">November</option>
                        <option value="December">December</option>
                      </select>

                      <!-- Year Dropdown -->
                      <select id="car-launch-year" name="car-launch-year" [(ngModel)]="vehLaunchYear" style="width: 110px;">
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                        <option value="2028">2028</option>
                        <option value="2029">2029</option>
                        <option value="2030">2030</option>
                      </select>
                    </div>
                    <div style="margin-top: 8px;">
                      <label style="display: flex; align-items: center; gap: 8px; font-weight: normal; font-size: 14px; cursor: pointer;">
                        <input type="checkbox" name="launch-date-override" [(ngModel)]="vehLaunchDateOverride">
                        Variant-specific exception (do not inherit model date)
                      </label>
                    </div>
                  </div>

                  <!-- Price -->
                  <div class="form-group">
                    <label for="price">{{ vehLifecycleStatus === 'Upcoming' ? 'Expected Price (e.g. ₹14.5 Lakhs / $38,990)' : 'Price (Ex-Showroom) (e.g. ₹14.5 Lakhs / $38,990)' }}</label>
                    <input type="text" id="price" name="price" [(ngModel)]="vehPrice">
                  </div>

                  <!-- Expected Battery & Range for Upcoming -->
                  <ng-container *ngIf="vehLifecycleStatus === 'Upcoming'">
                    <div class="form-group">
                      <label for="upcoming-battery">Expected Battery Capacity</label>
                      <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="number" step="0.1" min="0" id="upcoming-battery" name="upcoming-battery" [(ngModel)]="vehBatteryCapacityNum" placeholder="e.g. 82.5" style="flex: 1;">
                        <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">kWh</span>
                      </div>
                    </div>

                    <div class="form-group">
                      <label for="upcoming-range">Expected Claimed Range</label>
                      <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="number" step="1" min="0" id="upcoming-range" name="upcoming-range" [(ngModel)]="vehRangeNum" placeholder="e.g. 526" style="flex: 1;">
                        <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">km</span>
                        <select id="upcomingRangeStandard" name="upcomingRangeStandard" [(ngModel)]="vehRangeStandard" style="width: 110px;">
                          <option value="MIDC">MIDC</option>
                          <option value="WLTP">WLTP</option>
                          <option value="NEDC">NEDC</option>
                          <option value="EPA">EPA</option>
                          <option value="CLTC">CLTC</option>
                        </select>
                      </div>
                    </div>

                    <div class="form-group">
                      <label for="upcoming-overview">Short Overview / Expected Specs Summary</label>
                      <textarea id="upcoming-overview" name="upcoming-overview" [(ngModel)]="vehKeyHighlights" rows="3" placeholder="e.g. Expected launch in Late 2027 with dual-motor AWD and next-gen battery tech."></textarea>
                    </div>
                  </ng-container>

                  <!-- Body Style Dropdown -->
                  <div class="form-group">
                    <label for="car-body-style">Body Style</label>
                    <select id="car-body-style" name="car-body-style" [(ngModel)]="vehBodyStyle">
                      <option value="">Select Body Style...</option>
                      <option value="SUV">SUV</option>
                      <option value="Hatchback">Hatchback</option>
                      <option value="Sedan">Sedan</option>
                      <option value="MPV">MPV</option>
                      <option value="Sports">Sports</option>
                    </select>
                  </div>

                  <!-- Multi-Photo Gallery Upload -->
                  <div class="form-group">
                    <label>Vehicle Photos (Multi-Angle Gallery)</label>
                    <p style="font-size: 0.82rem; color: #94A3B8; margin-top: -4px; margin-bottom: 12px;">Upload up to 4 angles (Front, Side, Rear, Interior). Shared across all variants of this model.</p>
                    
                    <div *ngIf="isBorrowedImage" style="background: rgba(16, 185, 129, 0.15); color: #059669; padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 700; margin-bottom: 12px; border: 1px solid rgba(16, 185, 129, 0.3);">
                      ✓ Auto-linked photo gallery from {{ vehParentModel }} (No upload needed!)
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px;">
                      @for (label of ['1. Front (Main)', '2. Side Profile', '3. Rear View', '4. Interior']; track $index; let i = $index) {
                        <div style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); padding: 10px; border-radius: 8px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between;">
                          <span style="font-size: 0.75rem; color: #CBD5E1; font-weight: 600; margin-bottom: 6px;">{{ label }}</span>
                          
                          <div *ngIf="vehGalleryImages[i]" style="position: relative; width: 100%; aspect-ratio: 16/9; margin-bottom: 6px;">
                            <img [src]="vehGalleryImages[i]" style="width: 100%; height: 100%; object-fit: contain; border-radius: 4px; background: white;">
                          </div>

                          <div style="display: flex; gap: 4px; width: 100%;">
                            <label class="btn" style="flex: 1; cursor: pointer; background: #334155; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 0.75rem; text-align: center;">
                              <input type="file" accept="image/*" (change)="onVehImageFileSelected($event, i)" style="display: none;">
                              {{ vehGalleryImages[i] ? 'Change' : '+ Upload' }}
                            </label>
                            <button *ngIf="vehGalleryImages[i]" type="button" (click)="clearVehImageSlot(i)" style="background: #EF4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.75rem;">✕</button>
                          </div>
                        </div>
                      }
                    </div>
                    <p class="form-hint" *ngIf="vehImageProcessing" style="color: #00D4FF; font-size: 0.85rem; margin-top: 8px;">Processing and optimizing image...</p>
                  </div>
                </div>
              </div>

              <!-- Section 2: Performance & Motor -->
              <div class="admin-form-card" [class.locked-card]="vehLifecycleStatus === 'Upcoming'">
                <div class="admin-card-header" [class.disabled-header]="vehLifecycleStatus === 'Upcoming'" (click)="toggleSectionPerformance()">
                  <h4>🏎️ 2. Performance & Motor</h4>
                  <span class="card-toggle" *ngIf="vehLifecycleStatus !== 'Upcoming'">{{ adminSecPerformance ? '▲' : '▼' }}</span>
                  <span class="lock-badge" *ngIf="vehLifecycleStatus === 'Upcoming'">🔒 Available after official launch</span>
                </div>
                <div class="admin-card-body" *ngIf="adminSecPerformance && vehLifecycleStatus !== 'Upcoming'">
                  <div class="form-group">
                    <label for="acceleration">Acceleration (0-100 km/h)</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input type="number" step="0.1" min="0" id="acceleration" name="acceleration" [(ngModel)]="vehAccelerationNum" placeholder="e.g. 3.8" style="flex: 1;">
                      <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">Sec</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="maxPower">Max Power</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input type="number" step="1" min="0" id="maxPower" name="maxPower" [(ngModel)]="vehMaxPowerNum" placeholder="e.g. 201" style="flex: 1;">
                      <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">bhp</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="torque">Peak Torque</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input type="number" step="1" min="0" id="torque" name="torque" [(ngModel)]="vehTorqueNum" placeholder="e.g. 310" style="flex: 1;">
                      <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">Nm</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="drivetrain">Drivetrain Type</label>
                    <select id="drivetrain" name="drivetrain" [(ngModel)]="vehDrivetrain">
                      <option value="FWD">FWD (Front-Wheel Drive)</option>
                      <option value="RWD">RWD (Rear-Wheel Drive)</option>
                      <option value="AWD">AWD (All-Wheel Drive)</option>
                      <option value="FWD/AWD">FWD/AWD</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Section 3: Battery & Charging -->
              <div class="admin-form-card" [class.locked-card]="vehLifecycleStatus === 'Upcoming'">
                <div class="admin-card-header" [class.disabled-header]="vehLifecycleStatus === 'Upcoming'" (click)="toggleSectionBattery()">
                  <h4>🔋 3. Battery & Charging</h4>
                  <span class="card-toggle" *ngIf="vehLifecycleStatus !== 'Upcoming'">{{ adminSecBattery ? '▲' : '▼' }}</span>
                  <span class="lock-badge" *ngIf="vehLifecycleStatus === 'Upcoming'">🔒 Available after official launch</span>
                </div>
                <div class="admin-card-body" *ngIf="adminSecBattery && vehLifecycleStatus !== 'Upcoming'">
                  <div class="form-group">
                    <label for="battery">Battery Capacity</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input type="number" step="0.1" min="0" id="battery" name="battery" [(ngModel)]="vehBatteryCapacityNum" placeholder="e.g. 82.5" style="flex: 1;">
                      <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">kWh</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="range">Claimed Range</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input type="number" step="1" min="0" id="range" name="range" [(ngModel)]="vehRangeNum" placeholder="e.g. 526" style="flex: 1;">
                      <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">km</span>
                      <select id="rangeStandard" name="rangeStandard" [(ngModel)]="vehRangeStandard" style="width: 110px;">
                        <option value="MIDC">MIDC</option>
                        <option value="WLTP">WLTP</option>
                        <option value="NEDC">NEDC</option>
                        <option value="EPA">EPA</option>
                        <option value="CLTC">CLTC</option>
                      </select>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="batteryChemistry">Battery Chemistry</label>
                    <select id="batteryChemistry" name="batteryChemistry" [(ngModel)]="vehBatteryChemistry">
                      <option value="LFP">LFP (Lithium Iron Phosphate)</option>
                      <option value="NMC">NMC (Nickel Manganese Cobalt)</option>
                      <option value="Sodium-Ion">Sodium-Ion</option>
                      <option value="Solid-State">Solid-State</option>
                      <option value="Unknown">Unknown / Standard</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="portType">Charging Port Type</label>
                    <select id="portType" name="portType" [(ngModel)]="vehPortType">
                      <option value="CCS2">CCS2 (Standard India/EU)</option>
                      <option value="Type 2">Type 2 AC</option>
                      <option value="CHAdeMO">CHAdeMO</option>
                      <option value="GB/T">GB/T</option>
                      <option value="NACS">NACS (Tesla Supercharger)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="acCharging">AC Charging Speed</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input type="number" step="0.1" min="0" id="acCharging" name="acCharging" [(ngModel)]="vehAcChargingKW" placeholder="e.g. 11" style="flex: 1;">
                      <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">kW</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="dcCharging">DC Fast Charging Speed</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input type="number" step="1" min="0" id="dcCharging" name="dcCharging" [(ngModel)]="vehDcChargingKW" placeholder="e.g. 150" style="flex: 1;">
                      <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">kW</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Section 4: Safety & ADAS -->
              <div class="admin-form-card" [class.locked-card]="vehLifecycleStatus === 'Upcoming'">
                <div class="admin-card-header" [class.disabled-header]="vehLifecycleStatus === 'Upcoming'" (click)="toggleSectionSafety()">
                  <h4>🛡️ 4. Safety & ADAS</h4>
                  <span class="card-toggle" *ngIf="vehLifecycleStatus !== 'Upcoming'">{{ adminSecSafety ? '▲' : '▼' }}</span>
                  <span class="lock-badge" *ngIf="vehLifecycleStatus === 'Upcoming'">🔒 Available after official launch</span>
                </div>
                <div class="admin-card-body" *ngIf="adminSecSafety && vehLifecycleStatus !== 'Upcoming'">
                  <div class="form-group">
                    <label for="safety">NCAP Safety Rating</label>
                    <select id="safety" name="safety" [(ngModel)]="vehSafetyRating">
                      <option value="5-Star Euro NCAP">5-Star Euro NCAP</option>
                      <option value="5-Star Bharat NCAP">5-Star Bharat NCAP</option>
                      <option value="5-Star Global NCAP">5-Star Global NCAP</option>
                      <option value="5-Star ANCAP">5-Star ANCAP</option>
                      <option value="4-Star Euro NCAP">4-Star Euro NCAP</option>
                      <option value="4-Star Bharat NCAP">4-Star Bharat NCAP</option>
                      <option value="3-Star Euro NCAP">3-Star Euro NCAP</option>
                      <option value="Not Tested / N/A">Not Tested / N/A</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="adas">ADAS Level</label>
                    <select id="adas" name="adas" [(ngModel)]="vehAdas">
                      <option value="Level 2">Level 2</option>
                      <option value="Level 2+">Level 2+</option>
                      <option value="Level 1">Level 1</option>
                      <option value="Level 3">Level 3</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="airbags">Number of Airbags</label>
                    <select id="airbags" name="airbags" [(ngModel)]="vehAirbags">
                      <option value="6 Airbags">6 Airbags</option>
                      <option value="7 Airbags">7 Airbags</option>
                      <option value="8 Airbags">8 Airbags</option>
                      <option value="9+ Airbags">9+ Airbags</option>
                      <option value="4 Airbags">4 Airbags</option>
                      <option value="2 Airbags">2 Airbags</option>
                      <option value="0 Airbags">0 Airbags</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Section 5: Dimensions & Weight -->
              <div class="admin-form-card" [class.locked-card]="vehLifecycleStatus === 'Upcoming'">
                <div class="admin-card-header" [class.disabled-header]="vehLifecycleStatus === 'Upcoming'" (click)="toggleSectionDimensions()">
                  <h4>📐 5. Dimensions & Weight</h4>
                  <span class="card-toggle" *ngIf="vehLifecycleStatus !== 'Upcoming'">{{ adminSecDimensions ? '▲' : '▼' }}</span>
                  <span class="lock-badge" *ngIf="vehLifecycleStatus === 'Upcoming'">🔒 Available after official launch</span>
                </div>
                <div class="admin-card-body" *ngIf="adminSecDimensions && vehLifecycleStatus !== 'Upcoming'">
                  <div class="form-group">
                    <label>Dimensions (Length × Width × Height)</label>
                    <div style="display: flex; gap: 6px; align-items: center;">
                      <input type="number" min="0" id="dimLength" name="dimLength" [(ngModel)]="vehLengthMM" placeholder="Length (mm)" style="flex: 1;">
                      <span style="color: #94A3B8; font-weight: 700;">×</span>
                      <input type="number" min="0" id="dimWidth" name="dimWidth" [(ngModel)]="vehWidthMM" placeholder="Width (mm)" style="flex: 1;">
                      <span style="color: #94A3B8; font-weight: 700;">×</span>
                      <input type="number" min="0" id="dimHeight" name="dimHeight" [(ngModel)]="vehHeightMM" placeholder="Height (mm)" style="flex: 1;">
                      <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 12px; border-radius: 8px; font-weight: 700; font-size: 0.85rem;">mm</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="wheelbase">Wheelbase</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input type="number" min="0" id="wheelbase" name="wheelbase" [(ngModel)]="vehWheelbaseNum" placeholder="e.g. 2654" style="flex: 1;">
                      <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">mm</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="ground">Ground Clearance</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input type="number" min="0" id="ground" name="ground" [(ngModel)]="vehGroundClearanceNum" placeholder="e.g. 182" style="flex: 1;">
                      <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">mm</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="bootSpace">Boot Space</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input type="number" min="0" id="bootSpace" name="bootSpace" [(ngModel)]="vehBootSpaceNum" placeholder="e.g. 350" style="flex: 1;">
                      <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">L</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="frunkSpace">Frunk Space</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input type="number" min="0" id="frunkSpace" name="frunkSpace" [(ngModel)]="vehFrunkSpaceNum" placeholder="e.g. 50" style="flex: 1;">
                      <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">L</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="kerbWeight">Kerb Weight</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input type="number" min="0" id="kerbWeight" name="kerbWeight" [(ngModel)]="vehKerbWeightNum" placeholder="e.g. 1910" style="flex: 1;">
                      <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">kg</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="grossWeight">Gross Weight</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input type="number" min="0" id="grossWeight" name="grossWeight" [(ngModel)]="vehGrossWeightNum" placeholder="e.g. 2350" style="flex: 1;">
                      <span style="background: rgba(0, 212, 255, 0.15); color: #00D4FF; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;">kg</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="tyre">Tyre Size (e.g. 235/45 R18)</label>
                    <input type="text" id="tyre" name="tyre" [(ngModel)]="vehTyreSize">
                  </div>
                </div>
              </div>

              <!-- Section 6: Entertainment & Interior -->
              <div class="admin-form-card" [class.locked-card]="vehLifecycleStatus === 'Upcoming'">
                <div class="admin-card-header" [class.disabled-header]="vehLifecycleStatus === 'Upcoming'" (click)="toggleSectionEntertainment()">
                  <h4>🎵 6. Entertainment & Interior</h4>
                  <span class="card-toggle" *ngIf="vehLifecycleStatus !== 'Upcoming'">{{ adminSecEntertainment ? '▲' : '▼' }}</span>
                  <span class="lock-badge" *ngIf="vehLifecycleStatus === 'Upcoming'">🔒 Available after official launch</span>
                </div>
                <div class="admin-card-body" *ngIf="adminSecEntertainment && vehLifecycleStatus !== 'Upcoming'">
                  <div class="form-group">
                    <label for="seating">Seating Capacity</label>
                    <select id="seating" name="seating" [(ngModel)]="vehSeating">
                      <option value="5 Seats">5 Seats</option>
                      <option value="4 Seats">4 Seats</option>
                      <option value="6 Seats">6 Seats</option>
                      <option value="7 Seats">7 Seats</option>
                      <option value="2 Seats">2 Seats</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="screen">Screen Display (e.g. 15.6-inch Touchscreen)</label>
                    <input type="text" id="screen" name="screen" [(ngModel)]="vehScreen">
                  </div>
                  <div class="form-group">
                    <label for="audio">Audio System (e.g. 14-Speaker Meridian Audio)</label>
                    <input type="text" id="audio" name="audio" [(ngModel)]="vehAudio">
                  </div>
                  <div class="form-group">
                    <label for="connectivity">Connectivity (e.g. Wireless Apple CarPlay & Android Auto)</label>
                    <input type="text" id="connectivity" name="connectivity" [(ngModel)]="vehConnectivity">
                  </div>
                  <div class="form-group">
                    <label for="highlights">Key Highlights / Feature Upgrades</label>
                    <textarea id="highlights" name="highlights" [(ngModel)]="vehKeyHighlights" rows="3" placeholder="e.g. ADAS Level 2, Panoramic Sunroof, V2L Capability"></textarea>
                  </div>
                </div>
              </div>

              <div class="form-actions" style="margin-top: 20px;">
                <button type="submit" class="btn primary-btn" [disabled]="saving">
                  {{ saving ? 'Saving...' : (editingVehicleId ? 'Update Specs' : 'Save Specs') }}
                </button>
                <button *ngIf="editingVehicleId" type="button" (click)="cancelEditVehicle()" class="btn cancel-btn">
                  Cancel
                </button>
              </div>
            </form>
          </div>

          <!-- Manage Vehicle Specs List -->
          <div class="panel manage-panel">
            <h3>Registered EV Models</h3>
            <div class="articles-list-wrapper">
              @if (vehicles.length > 0) {
                <div *ngIf="adminViewLevel !== 'brands'" style="margin-bottom: 15px;">
                  <button (click)="goBackAdminLevel()" class="btn" style="background: #e2e8f0; color: #1e293b; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none;">
                    🔙 Back to {{ adminViewLevel === 'variants' ? 'Models' : 'Brands' }}
                  </button>
                  <span *ngIf="selectedAdminBrandId" style="margin-left: 10px; font-weight: bold; color: #0284C7;">
                    {{ getCategoryName(selectedAdminBrandId) }}
                  </span>
                  <span *ngIf="selectedAdminModel" style="font-weight: bold; color: #64748B;">
                    > {{ selectedAdminModel }}
                  </span>
                </div>

                <div class="table-container">
                  <table class="article-table">
                    
                    <!-- LEVEL 1: BRANDS -->
                    <ng-container *ngIf="adminViewLevel === 'brands'">
                      <thead>
                        <tr>
                          <th>Brand Name</th>
                          <th>Total Models</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (cat of getAdminBrands(); track cat.id) {
                          <tr>
                            <td class="article-title">{{ cat.name }}</td>
                            <td>{{ getAdminModelsForBrand(cat.id).length }} Models</td>
                            <td class="table-actions">
                              <button (click)="selectAdminBrand(cat.id)" class="btn view-btn" style="background: #0ea5e9; color: white;">View Models ➔</button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </ng-container>

                    <!-- LEVEL 2: MODELS -->
                    <ng-container *ngIf="adminViewLevel === 'models' && selectedAdminBrandId">
                      <thead>
                        <tr>
                          <th>Model Name</th>
                          <th>Total Variants</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (modelName of getAdminModelsForBrand(selectedAdminBrandId); track modelName) {
                          <tr>
                            <td class="article-title">{{ modelName }}</td>
                            <td>{{ getAdminVariants(selectedAdminBrandId, modelName).length }} Variants</td>
                            <td class="table-actions">
                              <button (click)="selectAdminModel(modelName)" class="btn view-btn" style="background: #10B981; color: white;">View Variants ➔</button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </ng-container>

                    <!-- LEVEL 3: VARIANTS -->
                    <ng-container *ngIf="adminViewLevel === 'variants' && selectedAdminBrandId && selectedAdminModel">
                      <thead>
                        <tr>
                          <th>Variant</th>
                          <th>Price</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (veh of getAdminVariants(selectedAdminBrandId, selectedAdminModel); track veh.id) {
                          <tr>
                            <td class="article-title" style="color: #A8B2B2; font-size: 0.95rem;">
                              {{ veh.variantName || 'Standard' }}
                              <span class="status-badge" [ngClass]="{
                                'status-upcoming': veh.lifecycleStatus === 'Upcoming' || veh.status === 'Upcoming',
                                'status-launched': !veh.lifecycleStatus || veh.lifecycleStatus === 'Launched' || veh.status === 'Launched'
                              }" style="margin-left: 6px;">
                                {{ veh.lifecycleStatus || (veh.status === 'Upcoming' ? 'Upcoming' : 'Launched') }}
                              </span>
                            </td>
                            <td>{{ veh.price }}</td>
                            <td class="table-actions">
                              <button (click)="startEditVehicle(veh)" class="btn edit-btn">Edit</button>
                              <button (click)="onDeleteVehicle(veh.id!, veh.name)" class="btn delete-btn">Delete</button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </ng-container>

                  </table>
                </div>
              } @else {
                <p class="no-articles">No vehicles stored in the database. Add one to enable comparison!</p>
              }
                  </div>     </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .admin-page {
      min-height: 90vh;
      background: #0D1418;
      color: #E6ECEC;
      padding: 120px 20px 60px 20px;
    }
    h2 {
      text-align: center;
      margin-bottom: 25px;
      font-size: 2.8rem;
      color: #00D4FF;
    }
    .admin-tabs {
      display: flex;
      justify-content: center;
      gap: 15px;
      margin-bottom: 40px;
      flex-wrap: wrap;
    }
    .admin-tabs button {
      padding: 12px 24px;
      background: #1A252A;
      color: #A8B2B2;
      border: 1px solid rgba(0, 212, 255, 0.1);
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    .admin-tabs button:hover, .admin-tabs button.active {
      background: rgba(0, 212, 255, 0.1);
      color: #00D4FF;
      border-color: #00D4FF;
    }
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .panel {
      background: #1A252A;
      border-radius: 12px;
      border: 1px solid rgba(0, 212, 255, 0.1);
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      height: fit-content;
    }
    .admin-form-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      margin-bottom: 14px;
      overflow: hidden;
    }
    .admin-card-header {
      padding: 14px 18px;
      background: rgba(255, 255, 255, 0.05);
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
      transition: background 0.2s ease;
    }
    .admin-card-header:hover {
      background: rgba(0, 212, 255, 0.1);
    }
    .admin-card-header h4 {
      margin: 0;
      font-size: 0.98rem;
      font-weight: 700;
      color: #00D4FF;
      letter-spacing: -0.01em;
    }
    .admin-card-body {
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: rgba(13, 20, 24, 0.5);
    }
    .card-toggle {
      font-size: 0.85rem;
      color: #00D4FF;
      font-weight: 800;
    }
    .scrollable-form {
      max-height: 600px;
      overflow-y: auto;
      padding-right: 10px;
    }
    h3 {
      font-size: 1.8rem;
      color: #00D4FF;
      margin-bottom: 30px;
      border-bottom: 1px solid rgba(0, 212, 255, 0.1);
      padding-bottom: 12px;
      font-weight: 500;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 24px;
    }
    label {
      font-size: 0.95rem;
      color: #A8B2B2;
      font-weight: 600;
    }
    input, select, textarea {
      padding: 12px 16px;
      background: #0D1418;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: white;
      outline: none;
      font-size: 0.95rem;
      transition: all 0.3s ease;
    }
    input:focus, select:focus, textarea:focus {
      border-color: #00D4FF;
      box-shadow: 0 0 8px rgba(0, 212, 255, 0.2);
    }
    .btn {
      padding: 10px 20px;
      border-radius: 6px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.9rem;
    }
    .primary-btn {
      background: #00D4FF;
      color: #0D1418;
      text-transform: uppercase;
      letter-spacing: 0.05rem;
      width: 100%;
    }
    .primary-btn:hover {
      background: #00b4db;
      box-shadow: 0 5px 15px rgba(0, 212, 255, 0.3);
    }
    .cancel-btn {
      background: #3a474d;
      color: white;
      width: 100%;
    }
    .cancel-btn:hover {
      background: #485860;
    }
    .form-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 15px;
    }
    .articles-list-wrapper {
      max-height: 550px;
      overflow-y: auto;
    }
    .admin-table, .article-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .admin-table th, .admin-table td, .article-table th, .article-table td {
      padding: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.95rem;
    }
    .admin-table th, .article-table th {
      color: #00D4FF;
      font-weight: 600;
      background: rgba(0, 0, 0, 0.15);
    }
    .article-title {
      font-weight: 500;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cat-label {
      background: rgba(245, 210, 142, 0.1);
      color: #f5d28e;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .table-actions {
      display: flex;
      gap: 8px;
    }
    .edit-btn {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      color: #00D4FF;
      padding: 5px 10px;
      font-size: 0.8rem;
      border-radius: 4px;
    }
    .edit-btn:hover {
      background: #00D4FF;
      color: #0D1418;
    }
    .delete-btn {
      background: rgba(255, 77, 77, 0.1);
      border: 1px solid rgba(255, 77, 77, 0.3);
      color: #ff4d4d;
      padding: 5px 10px;
      font-size: 0.8rem;
      border-radius: 4px;
    }
    .delete-btn:hover {
      background: #ff4d4d;
      color: white;
      box-shadow: 0 0 10px rgba(255, 77, 77, 0.2);
    }
    .no-articles {
      color: #A8B2B2;
      text-align: center;
      padding: 40px 20px;
    }
    .disabled-header {
      cursor: not-allowed !important;
      opacity: 0.75;
    }
    .lock-badge {
      font-size: 0.8rem;
      font-weight: 700;
      color: #F59E0B;
      background: rgba(245, 158, 11, 0.12);
      padding: 4px 10px;
      border-radius: 12px;
      border: 1px solid rgba(245, 158, 11, 0.25);
    }
    .locked-card {
      border: 1px dashed rgba(245, 158, 11, 0.3) !important;
    }
    .status-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
    }
    .status-upcoming {
      background: rgba(245, 158, 11, 0.15);
      color: #F59E0B;
    }
    .status-launched {
      background: rgba(16, 185, 129, 0.15);
      color: #10B981;
    }
    @media (max-width: 992px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AdminComponent implements OnInit {
  activeTab: 'articles' | 'vehicles' | 'brands' = 'articles';
  
  categories: Category[] = [];
  articles: Article[] = [];
  vehicles: CarSpec[] = [];
  private categoriesMap: Record<string, string> = {};
  
  // 1. Article Form Properties
  /** True after Edit until Cancel/successful save — blocks accidental POST create. */
  articleEditMode = false;
  editingArticleId: string | null = null;
  articleTitle = '';
  articleImageUrl = '';
  articleBlocks: ArticleBlock[] = [];
  selectedFileName = '';
  imageProcessing = false;

  // Editorial Relationships (Phase 7.4)
  articleRelArticles = '';
  articleRelVehicles = '';
  articleRelBrands = '';
  adminSecRelationships = false;

  // 2. Vehicle Form Properties
  editingVehicleId: string | null = null;
  vehName = '';
  vehCategoryId = '';
  vehBrandName = '';
  vehParentModel = '';
  vehVariantName = '';
  vehPrice = '';
  vehSeating = '';
  vehBodyStyle = '';
  vehDimensions = '';
  vehWheelbase = '';
  vehGroundClearance = '';
  vehKerbWeight = '';
  vehGrossWeight = '';
  vehBatteryCapacity = '';
  vehAcCharging = '';
  vehDcCharging = '';
  vehRange = '';
  vehTyreSize = '';
  vehBootFrunkSpace = '';
  vehBhpTorque = '';
  vehAcceleration = '';
  vehMaxPower = '';
  vehTorque = '';
  vehDrivetrain = '';
  vehSafetyRating = '';
  vehWeight = '';
  vehScreen = '';
  vehAudio = '';
  vehConnectivity = '';
  vehAdas = '';
  vehAirbags = '';
  vehImageUrl = '';
  vehGalleryImages: string[] = ['', '', '', ''];
  vehImageProcessing = false;
  vehKeyHighlights = '';
  isBorrowedImage = false;

  // Structured Unit Input State (Release 3)
  vehBatteryCapacityNum: number | null = null;
  vehRangeNum: number | null = null;
  vehRangeStandard = 'MIDC';
  vehBatteryChemistry = 'LFP';
  vehPortType = 'CCS2';
  vehLengthMM: number | null = null;
  vehWidthMM: number | null = null;
  vehHeightMM: number | null = null;
  vehWheelbaseNum: number | null = null;
  vehGroundClearanceNum: number | null = null;
  vehBootSpaceNum: number | null = null;
  vehFrunkSpaceNum: number | null = null;
  vehKerbWeightNum: number | null = null;
  vehGrossWeightNum: number | null = null;
  vehAccelerationNum: number | null = null;
  vehMaxPowerNum: number | null = null;
  vehTorqueNum: number | null = null;
  vehAcChargingKW: number | null = null;
  vehDcChargingKW: number | null = null;

  // Release 5.0 Upcoming Vehicle Lifecycle & Expected Launch State
  vehLifecycleStatus: 'Upcoming' | 'Launched' = 'Launched';
  vehLaunchPeriod: 'Early' | 'Mid' | 'Late' = 'Mid';
  vehLaunchMonth = 'July';
  vehLaunchYear = '2026';
  vehLaunchDateOverride = false;

  // 3. Admin Form Section Accordions
  adminSecOverview = true;
  adminSecPerformance = false;
  adminSecBattery = false;
  adminSecSafety = false;
  adminSecDimensions = false;
  adminSecEntertainment = false;

  onLifecycleStatusChange(status: string) {
    if (status === 'Upcoming') {
      this.adminSecPerformance = false;
      this.adminSecBattery = false;
      this.adminSecDimensions = false;
      this.adminSecSafety = false;
      this.adminSecEntertainment = false;
    }
  }

  toggleSectionPerformance() {
    if (this.vehLifecycleStatus === 'Upcoming') return;
    this.adminSecPerformance = !this.adminSecPerformance;
  }

  toggleSectionBattery() {
    if (this.vehLifecycleStatus === 'Upcoming') return;
    this.adminSecBattery = !this.adminSecBattery;
  }

  toggleSectionDimensions() {
    if (this.vehLifecycleStatus === 'Upcoming') return;
    this.adminSecDimensions = !this.adminSecDimensions;
  }

  toggleSectionSafety() {
    if (this.vehLifecycleStatus === 'Upcoming') return;
    this.adminSecSafety = !this.adminSecSafety;
  }

  toggleSectionEntertainment() {
    if (this.vehLifecycleStatus === 'Upcoming') return;
    this.adminSecEntertainment = !this.adminSecEntertainment;
  }

  getFormattedLaunchDate(): string {
    if (this.vehLifecycleStatus === 'Upcoming') {
      return `${this.vehLaunchPeriod} ${this.vehLaunchYear}`;
    }
    return `${this.vehLaunchMonth} ${this.vehLaunchYear}`;
  }

  saving = false;

  // 3. Brand Form Properties
  brandName = '';
  brandId = '';

  // 4. Hierarchical Admin View State
  adminViewLevel: 'brands' | 'models' | 'variants' = 'brands';
  selectedAdminBrandId: string | null = null;
  selectedAdminModel: string | null = null;

  constructor(
    private dataService: BlogDataService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private metaService: Meta
  ) {}

  ngOnInit() {
    // Prevent Google from indexing the admin panel
    this.metaService.addTag({ name: 'robots', content: 'noindex, nofollow' });

    // Guards check: Redirect if not authenticated
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadData();
  }

  setTab(tab: 'articles' | 'vehicles' | 'brands') {
    this.activeTab = tab;
  }

  loadData() {
    this.dataService.getCategories().subscribe(cats => {
      this.categories = cats;
      this.categoriesMap = cats.reduce((acc, cat) => {
        acc[cat.id] = cat.name;
        return acc;
      }, {} as Record<string, string>);
      this.cdr.detectChanges();
    });

    this.loadArticles();
    this.loadVehicles();
  }

  loadArticles() {
    this.dataService.getArticles().subscribe(data => {
      this.articles = data;
      this.cdr.detectChanges();
    });
  }

  /** Stable @for track + delete target (supports id / _id). */
  trackArticleId(art: Article): string {
    return resolveArticleId(art) || '';
  }

  loadVehicles() {
    this.dataService.getVehicles().subscribe(data => {
      this.vehicles = data;
      this.cdr.detectChanges();
    });
  }

  getCategoryName(catId: string): string {
    return this.categoriesMap[catId] || 'EV Insights';
  }

  private parseCommaIdList(input: string): string[] {
    if (!input || typeof input !== 'string') return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of input.split(',')) {
      const id = item.trim();
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  }

  // ==========================================
  // ARTICLES EVENT HANDLERS
  // ==========================================
  async onPublishArticle(event: Event) {
    event.preventDefault();
    if (this.saving) return;

    if (!this.articleTitle.trim()) {
      alert('Please provide at least a title for the article!');
      return;
    }

    // Edit mode must PUT — never fall through to POST create (prevents duplicates).
    const updateTarget = assertArticleUpdateTarget(this.articleEditMode, this.editingArticleId);
    if (this.articleEditMode && !updateTarget.ok) {
      alert(updateTarget.reason);
      return;
    }

    if (articleHasUploadingImages(this.articleBlocks, this.imageProcessing)) {
      alert('Please wait for image uploads to finish before saving.');
      return;
    }

    this.saving = true;
    this.cdr.detectChanges();

    const uploadViaApi = (file: File) =>
      firstValueFrom(this.dataService.uploadImage(file));

    try {
      // Defense-in-depth: any leftover data:image (e.g. pasted) → Cloudinary before serialize.
      this.articleImageUrl = await uploadCoverIfDataUrl(this.articleImageUrl, uploadViaApi);
      this.articleBlocks = await uploadDataImagesInBlocks(this.articleBlocks, uploadViaApi);

      const localPreviewError = assertNoLocalPreviewImages(this.articleBlocks, this.articleImageUrl);
      if (localPreviewError) {
        this.saving = false;
        this.cdr.detectChanges();
        alert(localPreviewError);
        return;
      }
    } catch (err: any) {
      this.saving = false;
      this.cdr.detectChanges();
      alert('Failed to upload article images to Cloudinary: ' + (err?.error?.error || err?.message || err));
      return;
    }

    // Persist blocks as __EVBLOCKS__ in paragraphs (Mongo schema has no blocks path).
    const serializedBlocks = JSON.stringify(this.articleBlocks);

    const fallbackParagraphs = this.articleBlocks
      .filter(b => b.type === 'paragraph' && b.data.text)
      .map(b => (b as any).data.text.trim());

    const paragraphs = [ `__EVBLOCKS__${serializedBlocks}`, ...fallbackParagraphs ];

    const generatedDesc = fallbackParagraphs[0]
      ? (fallbackParagraphs[0].length > 150 ? fallbackParagraphs[0].substring(0, 147) + '...' : fallbackParagraphs[0])
      : '';

    const relationships = {
      relatedArticleIds: this.parseCommaIdList(this.articleRelArticles),
      relatedVehicleIds: this.parseCommaIdList(this.articleRelVehicles),
      relatedBrandIds: this.parseCommaIdList(this.articleRelBrands)
    };

    const articleData: Article = {
      title: this.articleTitle.trim(),
      description: generatedDesc,
      imageUrl: this.articleImageUrl.trim(),
      categoryId: 'general',
      paragraphs: paragraphs,
      blocks: this.articleBlocks,
      active: true,
      relationships
    };

    if (updateTarget.ok) {
      articleData.id = updateTarget.id;
      this.dataService.updateArticle(updateTarget.id, articleData).subscribe({
        next: (updated) => {
          this.saving = false;
          // Immediate list sync from PUT payload (don't wait on cache/refetch).
          this.articles = upsertArticleInList(this.articles, {
            ...articleData,
            ...(updated || {}),
            id: updateTarget.id
          });
          this.cdr.detectChanges();
          alert('Article updated successfully!');
          this.cancelEditArticle();
          // Source-of-truth refresh after clearArticleCache inside updateArticle.
          this.loadArticles();
        },
        error: (err) => {
          this.saving = false;
          alert('Failed to update article: ' + err.message);
        }
      });
    } else {
      this.dataService.addArticle(articleData).subscribe({
        next: (created) => {
          this.saving = false;
          alert('Article published successfully!');
          this.articleEditMode = false;
          this.editingArticleId = null;
          this.resetArticleForm();
          if (created) {
            this.articles = upsertArticleInList(this.articles, created);
            this.cdr.detectChanges();
          }
          this.loadArticles();
        },
        error: (err) => {
          this.saving = false;
          alert('Failed to publish article: ' + err.message);
        }
      });
    }
  }

  startEditArticle(art: Article) {
    const id = resolveArticleId(art);
    if (!id) {
      alert('Cannot edit this article: missing ID. Refresh the page and try again.');
      return;
    }

    this.articleEditMode = true;
    this.editingArticleId = id;
    this.articleTitle = art.title;
    this.articleImageUrl = art.imageUrl || '';
    this.articleBlocks = hydrateArticleBlocks(art);

    const initialRels = normalizeArticleRelationships(art.relationships);
    this.articleRelArticles = initialRels.relatedArticleIds.join(', ');
    this.articleRelVehicles = initialRels.relatedVehicleIds.join(', ');
    this.articleRelBrands = initialRels.relatedBrandIds.join(', ');
    this.cdr.detectChanges();

    // Canonical detail fetch — list payloads can omit body; always re-bind stable id.
    this.dataService.getArticleById(id).subscribe({
      next: (full) => {
        if (!full || this.editingArticleId !== id) return;
        this.editingArticleId = resolveArticleId(full) || id;
        this.articleEditMode = true;
        this.articleTitle = full.title;
        this.articleImageUrl = full.imageUrl || '';
        this.articleBlocks = hydrateArticleBlocks(full);

        const rels = normalizeArticleRelationships(full.relationships || art.relationships);
        this.articleRelArticles = rels.relatedArticleIds.join(', ');
        this.articleRelVehicles = rels.relatedVehicleIds.join(', ');
        this.articleRelBrands = rels.relatedBrandIds.join(', ');
        this.cdr.detectChanges();
      },
      error: () => {
        // Keep list-hydrated form; edit id already locked so save still PUTs.
      }
    });
  }

  cancelEditArticle() {
    this.articleEditMode = false;
    this.editingArticleId = null;
    this.resetArticleForm();
  }

  resetArticleForm() {
    this.articleTitle = '';
    this.articleImageUrl = '';
    this.articleBlocks = [];
    this.articleRelArticles = '';
    this.articleRelVehicles = '';
    this.articleRelBrands = '';
    this.adminSecRelationships = false;
    this.selectedFileName = '';
    this.imageProcessing = false;
    this.cdr.detectChanges();
  }

  onImageFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      this.imageProcessing = true;
      this.selectedFileName = file.name;
      this.cdr.detectChanges();
      
      this.dataService.uploadImage(file).subscribe({
        next: (res: any) => {
          this.articleImageUrl = res.url;
          this.imageProcessing = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Cloudinary upload error:', err);
          alert('Failed to upload image to Cloudinary: ' + (err.error?.error || err.message));
          this.imageProcessing = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  clearImagePreview() {
    if (this.articleImageUrl && this.articleImageUrl.includes('cloudinary')) {
      this.dataService.deleteImage(this.articleImageUrl).subscribe({
        error: (err: any) => console.warn('Cloudinary article image deletion warning:', err)
      });
    }
    this.articleImageUrl = '';
    this.selectedFileName = '';
    const fileInput = document.getElementById('imageFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    this.cdr.detectChanges();
  }

  onDeleteArticle(id: string, title: string) {
    if (confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      this.dataService.deleteArticle(id).subscribe({
        next: () => {
          this.loadArticles();
          if (this.editingArticleId === id) this.cancelEditArticle();
        },
        error: (err) => alert('Delete failed: ' + err.message)
      });
    }
  }

  // ==========================================
  // VEHICLE SPECS EVENT HANDLERS
  // ==========================================
  onSaveVehicle(event: Event) {
    event.preventDefault();
    if (this.saving) return;

    if (!this.vehParentModel.trim() || !this.vehVariantName.trim() || !this.vehBrandName.trim()) {
      alert('Model (e.g. Nexon EV), Variant (e.g. Empowered+ LR), and Brand Category are required!');
      return;
    }

    const model = this.vehParentModel.trim();
    const variant = this.vehVariantName.trim();
    const brandNameTrimmed = this.vehBrandName.trim();

    // Check if brand exists
    const matchedBrand = this.categories.find(c => c.name.toLowerCase() === brandNameTrimmed.toLowerCase());
    
    if (matchedBrand) {
      this.vehCategoryId = matchedBrand.id;
      this._executeSaveVehicle(model, variant);
    } else {
      // Auto-create brand
      this.saving = true;
      const cleanId = brandNameTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      this.dataService.addCategory({ id: cleanId, name: brandNameTrimmed }).subscribe({
        next: () => {
          this.vehCategoryId = cleanId;
          this.loadData(); // reload categories
          this._executeSaveVehicle(model, variant);
        },
        error: (err) => {
          this.saving = false;
          alert('Failed to auto-create brand: ' + err.message);
        }
      });
    }
  }

  private normalizeModel(name: string): string {
    if (!name) return '';
    return name.trim().replace(/\s+/g, ' ');
  }

  private compareModels(a: string, b: string): boolean {
    return this.normalizeModel(a).toLowerCase() === this.normalizeModel(b).toLowerCase();
  }

  private _executeSaveVehicle(model: string, variant: string) {

    if (this.compareModels(model, variant)) {
      alert('Validation Error: The Model name and Variant name cannot be exactly the same (e.g., if Model is "Punch", Variant should be "30kWh" or "Pure", not "Punch"). Please give them different names.');
      return;
    }

    const normModel = this.normalizeModel(model);
    const fullName = `${normModel}::${variant.trim()}`;

    const acText = this.vehAcChargingKW ? `${this.vehAcChargingKW} kW` : (this.vehAcCharging.trim() || 'N/A');
    const dcText = this.vehDcChargingKW ? `${this.vehDcChargingKW} kW` : (this.vehDcCharging.trim() || 'N/A');
    const batText = this.vehBatteryCapacityNum ? `${this.vehBatteryCapacityNum} kWh` : (this.vehBatteryCapacity.trim() || 'N/A');
    const rangeText = this.vehRangeNum ? `${this.vehRangeNum} km (${this.vehRangeStandard || 'MIDC'})` : (this.vehRange.trim() || 'N/A');
    const highlights = this.vehKeyHighlights.trim() || 'N/A';
    
    let finalGalleryUrls = this.vehGalleryImages.filter(u => u && u.trim().length > 10).join(';;;');
    if (this.isBorrowedImage && !finalGalleryUrls) {
      finalGalleryUrls = '';
    }

    const batEncoded = `${batText}||${acText}||${dcText}||${finalGalleryUrls || 'N/A'}||${rangeText}||${highlights}||${this.vehBodyStyle || 'N/A'}`;

    let dimStr = 'N/A';
    if (this.vehLengthMM && this.vehWidthMM && this.vehHeightMM) {
      dimStr = `${this.vehLengthMM} x ${this.vehWidthMM} x ${this.vehHeightMM} mm`;
    } else if (this.vehDimensions.trim()) {
      dimStr = this.vehDimensions.trim();
    }
    const wheelbaseStr = this.vehWheelbaseNum ? `${this.vehWheelbaseNum} mm` : (this.vehWheelbase.trim() || 'N/A');
    const dimensionsEncoded = `${dimStr}||${wheelbaseStr}`;

    const groundStr = this.vehGroundClearanceNum ? `${this.vehGroundClearanceNum} mm` : (this.vehGroundClearance.trim() || 'N/A');

    const kerbStr = this.vehKerbWeightNum ? `${this.vehKerbWeightNum} kg` : (this.vehKerbWeight.trim() || 'N/A');
    const grossStr = this.vehGrossWeightNum ? `${this.vehGrossWeightNum} kg` : (this.vehGrossWeight.trim() || 'N/A');
    const weightCombined = `${kerbStr}~${grossStr}`;

    const accStr = this.vehAccelerationNum ? `${this.vehAccelerationNum} Sec` : (this.vehAcceleration.trim() || 'N/A');
    const powerStr = this.vehMaxPowerNum ? `${this.vehMaxPowerNum} bhp` : (this.vehMaxPower.trim() || 'N/A');
    const torqueStr = this.vehTorqueNum ? `${this.vehTorqueNum} Nm` : (this.vehTorque.trim() || 'N/A');
    const perfEncoded = `${accStr}||${powerStr}||${torqueStr}`;

    const bootStr = this.vehBootSpaceNum ? `${this.vehBootSpaceNum} L` : '';
    const frunkStr = this.vehFrunkSpaceNum ? `${this.vehFrunkSpaceNum} L` : '';
    let bootFrunkStr = 'N/A';
    if (bootStr && frunkStr) bootFrunkStr = `${bootStr} / ${frunkStr}`;
    else if (bootStr) bootFrunkStr = bootStr;
    else if (this.vehBootFrunkSpace.trim()) bootFrunkStr = this.vehBootFrunkSpace.trim();

    const vehicleData: CarSpec = {
      name: fullName,
      categoryId: this.vehCategoryId,
      parentModel: normModel,
      variantName: variant.trim(),
      price: this.vehPrice.trim() || 'N/A',
      seating: `${this.vehSeating.trim() || '5 Seats'}||N/A||${weightCombined}||${this.vehScreen.trim() || 'N/A'}||${this.vehAudio.trim() || 'N/A'}||${this.vehConnectivity.trim() || 'N/A'}`,
      dimensions: dimensionsEncoded,
      groundClearance: groundStr,
      batteryCapacity: batEncoded,
      range: rangeText,
      tyreSize: this.vehTyreSize.trim() || 'N/A',
      bootFrunkSpace: bootFrunkStr,
      bhpTorque: perfEncoded,
      drivetrain: this.vehDrivetrain || 'FWD',
      safetyRating: `${this.vehSafetyRating || '5-Star Euro NCAP'}||${this.vehAdas || 'Level 2'}||${this.vehAirbags || '6 Airbags'}`,
      imageUrl: this.vehImageUrl.trim(),
      keyHighlights: highlights,
      kerbWeight: kerbStr,
      grossWeight: grossStr,
      wheelbase: wheelbaseStr,
      acCharging: acText,
      dcCharging: dcText,
      acceleration: accStr,
      maxPower: powerStr,
      torque: torqueStr,
      lifecycleStatus: this.vehLifecycleStatus,
      status: this.vehLifecycleStatus,
      launchDate: this.getFormattedLaunchDate(),
      isLaunchDateOverride: this.vehLaunchDateOverride
    };

    if (this.editingVehicleId) {
      vehicleData.id = this.editingVehicleId;
    }

    this.saving = true;

    this.dataService.saveVehicle(vehicleData).subscribe({
      next: () => {
        this.saving = false;
        alert(this.editingVehicleId ? 'Vehicle specs updated successfully!' : 'Vehicle specs saved successfully!');
        this.dataService.clearVehicleCache();
        this.cancelEditVehicle();
        this.loadVehicles();
      },
      error: (err) => {
        this.saving = false;
        alert('Failed to save specifications: ' + err.message);
      }
    });
  }

  startEditVehicle(veh: CarSpec) {
    this.editingVehicleId = veh.id || null;
    this.vehName = veh.name;
    
    let pModel = this.normalizeModel(veh.parentModel || veh.name);
    let vName = veh.variantName || veh.name;

    if (this.compareModels(pModel, vName)) {
      const words = veh.name.split(' ');
      pModel = words[0];
      vName = veh.name.substring(pModel.length).trim() || 'Base';
    }

    this.vehParentModel = pModel;
    this.vehVariantName = vName;
    this.vehCategoryId = veh.categoryId;
    const matchedCat = this.categories.find(c => c.id === veh.categoryId);
    this.vehBrandName = matchedCat ? matchedCat.name : '';
    this.vehPrice = veh.price;
    this.vehSeating = veh.seating && veh.seating.includes('Seats') ? veh.seating : '5 Seats';
    this.vehDimensions = veh.dimensions;
    this.vehWheelbase = veh.wheelbase || '';
    this.vehGroundClearance = veh.groundClearance;

    this.vehLifecycleStatus = (veh.lifecycleStatus as any) || (veh.status === 'Upcoming' ? 'Upcoming' : 'Launched');
    if (this.vehLifecycleStatus === 'Upcoming') {
      this.adminSecPerformance = false;
      this.adminSecBattery = false;
      this.adminSecDimensions = false;
      this.adminSecSafety = false;
      this.adminSecEntertainment = false;
    }

    const launchStr = veh.launchDate || '';
    this.vehLaunchDateOverride = veh.isLaunchDateOverride || false;

    if (launchStr) {
      const parts = launchStr.split(' ');
      if (parts.length >= 2) {
        if (['Early', 'Mid', 'Late'].includes(parts[0])) {
          this.vehLaunchPeriod = parts[0] as any;
        } else {
          this.vehLaunchMonth = parts[0];
        }
        this.vehLaunchYear = parts[1];
      }
    } else {
      // Find model default from siblings
      const sibling = this.vehicles.find(v => v.parentModel === veh.parentModel && v.launchDate && v.id !== veh.id);
      if (sibling && sibling.launchDate) {
        const parts = sibling.launchDate.split(' ');
        if (parts.length >= 2) {
          if (['Early', 'Mid', 'Late'].includes(parts[0])) {
            this.vehLaunchPeriod = parts[0] as any;
          } else {
            this.vehLaunchMonth = parts[0];
          }
          this.vehLaunchYear = parts[1];
        }
      } else {
        this.vehLaunchPeriod = 'Mid';
        this.vehLaunchMonth = 'July';
        this.vehLaunchYear = '2026';
      }
    }

    // Parse weights
    const kerbMatch = (veh.kerbWeight || veh.weight || '').match(/(\d+(?:\.\d+)?)/);
    this.vehKerbWeightNum = kerbMatch ? parseFloat(kerbMatch[1]) : null;
    this.vehKerbWeight = veh.kerbWeight || veh.weight || '';

    const grossMatch = (veh.grossWeight || '').match(/(\d+(?:\.\d+)?)/);
    this.vehGrossWeightNum = grossMatch ? parseFloat(grossMatch[1]) : null;
    this.vehGrossWeight = veh.grossWeight || '';

    // Parse battery capacity number
    const batMatch = (veh.batteryCapacity || '').match(/(\d+(?:\.\d+)?)/);
    this.vehBatteryCapacityNum = batMatch ? parseFloat(batMatch[1]) : null;
    this.vehBatteryCapacity = veh.batteryCapacity || '';

    // Parse range number and standard
    const rangeMatch = (veh.range || '').match(/(\d+(?:\.\d+)?)\s*km(?:\s*\(([^)]+)\))?/i);
    if (rangeMatch) {
      this.vehRangeNum = parseFloat(rangeMatch[1]);
      this.vehRangeStandard = (rangeMatch[2] || 'MIDC').toUpperCase();
    } else {
      const numOnly = (veh.range || '').match(/(\d+(?:\.\d+)?)/);
      this.vehRangeNum = numOnly ? parseFloat(numOnly[1]) : null;
      this.vehRangeStandard = 'MIDC';
    }
    this.vehRange = veh.range || '';

    // Parse length, width, height
    const dimMatch = (veh.dimensions || '').match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
    if (dimMatch) {
      this.vehLengthMM = parseFloat(dimMatch[1]);
      this.vehWidthMM = parseFloat(dimMatch[2]);
      this.vehHeightMM = parseFloat(dimMatch[3]);
    } else {
      this.vehLengthMM = null;
      this.vehWidthMM = null;
      this.vehHeightMM = null;
    }

    // Parse AC Charging kW
    const acKwMatch = (veh.acCharging || '').match(/(\d+(?:\.\d+)?)/);
    this.vehAcChargingKW = acKwMatch ? parseFloat(acKwMatch[1]) : null;
    this.vehAcCharging = veh.acCharging || '';

    // Parse DC Fast Charging kW
    const dcKwMatch = (veh.dcCharging || '').match(/(\d+(?:\.\d+)?)/);
    this.vehDcChargingKW = dcKwMatch ? parseFloat(dcKwMatch[1]) : null;
    this.vehDcCharging = veh.dcCharging || '';

    // Parse Acceleration sec
    const accMatch = (veh.acceleration || '').match(/(\d+(?:\.\d+)?)/);
    this.vehAccelerationNum = accMatch ? parseFloat(accMatch[1]) : null;
    this.vehAcceleration = veh.acceleration || '';

    // Parse Max Power bhp
    const powerMatch = (veh.maxPower || veh.bhpTorque || '').match(/(\d+(?:\.\d+)?)/);
    this.vehMaxPowerNum = powerMatch ? parseFloat(powerMatch[1]) : null;
    this.vehMaxPower = veh.maxPower || veh.bhpTorque || '';

    // Parse Torque Nm
    const torqueMatch = (veh.torque || '').match(/(\d+(?:\.\d+)?)/);
    this.vehTorqueNum = torqueMatch ? parseFloat(torqueMatch[1]) : null;
    this.vehTorque = veh.torque || '';

    // Parse Wheelbase mm
    const wbMatch = (veh.wheelbase || '').match(/(\d+(?:\.\d+)?)/);
    this.vehWheelbaseNum = wbMatch ? parseFloat(wbMatch[1]) : null;

    // Parse Ground Clearance mm
    const gcMatch = (veh.groundClearance || '').match(/(\d+(?:\.\d+)?)/);
    this.vehGroundClearanceNum = gcMatch ? parseFloat(gcMatch[1]) : null;

    // Parse Boot space L
    const bootMatch = (veh.bootFrunkSpace || '').match(/(\d+(?:\.\d+)?)\s*L/i);
    this.vehBootSpaceNum = bootMatch ? parseFloat(bootMatch[1]) : null;

    // Parse Frunk space L
    const frunkMatch = (veh.bootFrunkSpace || '').match(/\/\s*(\d+(?:\.\d+)?)\s*L/i);
    this.vehFrunkSpaceNum = frunkMatch ? parseFloat(frunkMatch[1]) : null;

    this.vehTyreSize = veh.tyreSize;
    this.vehBootFrunkSpace = veh.bootFrunkSpace;
    this.vehBhpTorque = veh.bhpTorque || '';
    this.vehDrivetrain = veh.drivetrain || 'FWD';
    this.vehSafetyRating = veh.safetyRating?.includes('Star') ? veh.safetyRating : '5-Star Euro NCAP';
    this.vehWeight = veh.weight || '';
    this.vehScreen = veh.screen || '';
    this.vehAudio = veh.audio || '';
    this.vehConnectivity = veh.connectivity || '';
    this.vehAdas = veh.adasLevel || 'Level 2';
    this.vehAirbags = veh.airbags ? (veh.airbags.includes('Airbags') ? veh.airbags : `${veh.airbags} Airbags`) : '6 Airbags';
    this.vehImageUrl = veh.imageUrl || '';
    this.vehGalleryImages = veh.galleryImages && veh.galleryImages.length > 0 
      ? [veh.galleryImages[0] || '', veh.galleryImages[1] || '', veh.galleryImages[2] || '', veh.galleryImages[3] || '']
      : [veh.imageUrl || '', '', '', ''];
    this.vehKeyHighlights = veh.keyHighlights || '';
    this.vehBodyStyle = veh.bodyStyle || 'SUV';
    this.isBorrowedImage = veh.imageBorrowed || false;
  }

  cancelEditVehicle() {
    this.editingVehicleId = null;
    this.resetVehicleFormExceptBrand();
    this.vehBrandName = '';
    this.vehCategoryId = '';
  }

  onFormBrandChange() {
    const matched = this.categories.find(c => c.name.toLowerCase() === this.vehBrandName.trim().toLowerCase());
    const nextCategoryId = matched ? matched.id : '';

    if (this.editingVehicleId) {
      const editing = this.vehicles.find(v => v.id === this.editingVehicleId);
      const currentBrand = editing
        ? (this.categories.find(c => c.id === editing.categoryId)?.name || '')
        : '';
      const brandUnchanged =
        this.vehBrandName.trim().toLowerCase() === currentBrand.trim().toLowerCase() ||
        (nextCategoryId && editing && nextCategoryId === editing.categoryId);

      if (brandUnchanged) {
        this.vehCategoryId = nextCategoryId || this.vehCategoryId;
        this.cdr.detectChanges();
        return;
      }

      this.editingVehicleId = null;
      this.resetVehicleFormExceptBrand();
    }

    this.vehCategoryId = nextCategoryId;
    this.cdr.detectChanges();
  }

  onFormModelSelectChange() {
    if (!this.editingVehicleId || this.editingVehicleId === 'null') {
      this.editingVehicleId = null;
      this.resetVehicleFormExceptBrand();
      return;
    }
    const car = this.vehicles.find(v => v.id === this.editingVehicleId);
    if (car) {
      this.startEditVehicle(car);
    }
  }

  onModelNameChange(modelName: string) {
    if (!modelName || !modelName.trim()) {
      if (this.isBorrowedImage) {
        this.vehImageUrl = '';
        this.isBorrowedImage = false;
      }
      return;
    }

    const normTarget = this.normalizeModel(modelName).toLowerCase();

    // Look for matching existing vehicle with an image under the current brand OR globally if model name matches
    const existingVehicleWithImage = this.vehicles.find(v => {
      const pModel = this.normalizeModel(v.parentModel || v.name).toLowerCase();
      const isModelMatch = pModel === normTarget;
      const isBrandMatch = !this.vehCategoryId || v.categoryId === this.vehCategoryId;
      return isModelMatch && isBrandMatch && v.imageUrl && v.imageUrl.length > 10;
    });

    if (existingVehicleWithImage) {
      if (existingVehicleWithImage.galleryImages && existingVehicleWithImage.galleryImages.length > 0) {
        this.vehGalleryImages = [
          existingVehicleWithImage.galleryImages[0] || '',
          existingVehicleWithImage.galleryImages[1] || '',
          existingVehicleWithImage.galleryImages[2] || '',
          existingVehicleWithImage.galleryImages[3] || ''
        ];
        this.vehImageUrl = this.vehGalleryImages[0];
      } else {
        this.vehImageUrl = existingVehicleWithImage.imageUrl || '';
        this.vehGalleryImages = [this.vehImageUrl, '', '', ''];
      }
      this.isBorrowedImage = true;
    } else if (this.isBorrowedImage) {
      this.vehImageUrl = '';
      this.vehGalleryImages = ['', '', '', ''];
      this.isBorrowedImage = false;
    }

    // Auto-prefill the 5 core physical specs if present on existing model entry
    const existingVehicleWithSpecs = this.vehicles.find(v => {
      const pModel = this.normalizeModel(v.parentModel || v.name).toLowerCase();
      const isModelMatch = pModel === normTarget;
      const isBrandMatch = !this.vehCategoryId || v.categoryId === this.vehCategoryId;
      return isModelMatch && isBrandMatch;
    });

    if (existingVehicleWithSpecs) {
      if (!this.vehDimensions && existingVehicleWithSpecs.dimensions && existingVehicleWithSpecs.dimensions !== 'N/A') {
        this.vehDimensions = existingVehicleWithSpecs.dimensions;
      }
      if (!this.vehWheelbase && existingVehicleWithSpecs.wheelbase && existingVehicleWithSpecs.wheelbase !== 'N/A') {
        this.vehWheelbase = existingVehicleWithSpecs.wheelbase;
      }
      if (!this.vehGroundClearance && existingVehicleWithSpecs.groundClearance && existingVehicleWithSpecs.groundClearance !== 'N/A') {
        this.vehGroundClearance = existingVehicleWithSpecs.groundClearance;
      }
      if (!this.vehBodyStyle && existingVehicleWithSpecs.bodyStyle && existingVehicleWithSpecs.bodyStyle !== 'N/A') {
        this.vehBodyStyle = existingVehicleWithSpecs.bodyStyle;
      }
      if (!this.vehBootFrunkSpace && existingVehicleWithSpecs.bootFrunkSpace && existingVehicleWithSpecs.bootFrunkSpace !== 'N/A') {
        this.vehBootFrunkSpace = existingVehicleWithSpecs.bootFrunkSpace;
      }
    }

    this.cdr.detectChanges();
  }

  getFilteredModels(brandId: string | null): CarSpec[] {
    if (!brandId) return [];
    return this.vehicles.filter(car => car.categoryId === brandId);
  }

  getUniqueModelNames(brandId: string | null): string[] {
    if (!brandId) return [];
    const models = this.vehicles
      .filter(car => car.categoryId === brandId)
      .map(car => this.normalizeModel(car.parentModel || car.name));
    
    const uniqueMap = new Map<string, string>();
    for (const m of models) {
      if (!m) continue;
      const key = m.toLowerCase();
      if (!uniqueMap.has(key)) uniqueMap.set(key, m);
    }
    return Array.from(uniqueMap.values());
  }

  resetVehicleForm() {
    this.vehBrandName = '';
    this.vehCategoryId = '';
    this.resetVehicleFormExceptBrand();
  }

  resetVehicleFormExceptBrand() {
    this.vehLifecycleStatus = 'Launched';
    this.vehLaunchPeriod = 'Mid';
    this.vehLaunchMonth = 'July';
    this.vehLaunchYear = '2026';
    this.vehLaunchDateOverride = false;
    this.vehName = '';
    this.vehParentModel = '';
    this.vehVariantName = '';
    this.vehPrice = '';
    this.vehSeating = '';
    this.vehDimensions = '';
    this.vehGroundClearance = '';
    this.vehBatteryCapacity = '';
    this.vehAcCharging = '';
    this.vehDcCharging = '';
    this.vehRange = '';
    this.vehTyreSize = '';
    this.vehBootFrunkSpace = '';
    this.vehBhpTorque = '';
    this.vehAcceleration = '';
    this.vehMaxPower = '';
    this.vehTorque = '';
    this.vehDrivetrain = '';
    this.vehSafetyRating = '';
    this.vehWeight = '';
    this.vehKerbWeight = '';
    this.vehGrossWeight = '';
    this.vehWheelbase = '';
    this.vehBodyStyle = '';
    this.vehScreen = '';
    this.vehAudio = '';
    this.vehConnectivity = '';
    this.vehAdas = '';
    this.vehAirbags = '';
    this.vehImageUrl = '';
    this.vehGalleryImages = ['', '', '', ''];
    this.vehImageProcessing = false;
    this.vehKeyHighlights = '';
    this.isBorrowedImage = false;
    this.vehBatteryCapacityNum = null;
    this.vehRangeNum = null;
    this.vehRangeStandard = 'MIDC';
    this.vehBatteryChemistry = 'LFP';
    this.vehPortType = 'CCS2';
    this.vehLengthMM = null;
    this.vehWidthMM = null;
    this.vehHeightMM = null;
    this.vehWheelbaseNum = null;
    this.vehGroundClearanceNum = null;
    this.vehBootSpaceNum = null;
    this.vehFrunkSpaceNum = null;
    this.vehKerbWeightNum = null;
    this.vehGrossWeightNum = null;
    this.vehAccelerationNum = null;
    this.vehMaxPowerNum = null;
    this.vehTorqueNum = null;
    this.vehAcChargingKW = null;
    this.vehDcChargingKW = null;
    this.vehDrivetrain = 'FWD';
    this.vehSafetyRating = '5-Star Euro NCAP';
    this.vehAdas = 'Level 2';
    this.vehAirbags = '6 Airbags';
    this.vehSeating = '5 Seats';
    this.vehBodyStyle = 'SUV';
  }

  onVehImageFileSelected(event: Event, slotIndex: number = 0) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      this.vehImageProcessing = true;
      this.cdr.detectChanges();
      
      this.dataService.uploadImage(file).subscribe({
        next: (res: any) => {
          this.vehGalleryImages[slotIndex] = res.url;
          if (slotIndex === 0) {
            this.vehImageUrl = res.url;
          }
          this.isBorrowedImage = false;
          this.vehImageProcessing = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Cloudinary upload error:', err);
          alert('Failed to upload vehicle image to Cloudinary: ' + (err.error?.error || err.message));
          this.vehImageProcessing = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  clearVehImageSlot(slotIndex: number) {
    const existingUrl = this.vehGalleryImages[slotIndex];
    if (existingUrl && existingUrl.includes('cloudinary')) {
      this.dataService.deleteImage(existingUrl).subscribe({
        error: (err: any) => console.warn('Cloudinary slot deletion warning:', err)
      });
    }
    this.vehGalleryImages[slotIndex] = '';
    if (slotIndex === 0) {
      this.vehImageUrl = '';
    }
    this.isBorrowedImage = false;
    this.cdr.detectChanges();
  }

  clearVehImagePreview() {
    this.vehGalleryImages.forEach(url => {
      if (url && url.includes('cloudinary')) {
        this.dataService.deleteImage(url).subscribe({
          error: (err: any) => console.warn('Cloudinary image deletion warning:', err)
        });
      }
    });
    this.vehImageUrl = '';
    this.vehGalleryImages = ['', '', '', ''];
    this.vehImageProcessing = false;
    this.isBorrowedImage = false;
  }

  onDeleteVehicle(id: string, name: string) {
    if (confirm(`Are you sure you want to delete specs for "${name}"?`)) {
      this.dataService.deleteVehicle(id).subscribe({
        next: () => {
          this.dataService.clearVehicleCache();
          this.loadVehicles();
          if (this.editingVehicleId === id) this.cancelEditVehicle();
        },
        error: (err) => alert('Delete failed: ' + err.message)
      });
    }
  }
  // ==========================================
  // HIERARCHICAL VEHICLE LIST LOGIC
  // ==========================================
  
  getAdminBrands() {
    return this.categories;
  }
  
  getAdminModelsForBrand(brandId: string) {
    const rawModels = this.vehicles
      .filter(v => v.categoryId === brandId)
      .map(v => this.normalizeModel(v.parentModel || v.name));
    
    const uniqueMap = new Map<string, string>();
    for (const m of rawModels) {
      if (!m) continue;
      const key = m.toLowerCase();
      if (!uniqueMap.has(key)) uniqueMap.set(key, m);
    }
    return Array.from(uniqueMap.values());
  }
  
  getAdminVariants(brandId: string, modelName: string) {
    const targetKey = this.normalizeModel(modelName).toLowerCase();
    return this.vehicles.filter(v => 
      v.categoryId === brandId && 
      this.normalizeModel(v.parentModel || v.name).toLowerCase() === targetKey
    );
  }
  
  selectAdminBrand(brandId: string) {
    this.selectedAdminBrandId = brandId;
    this.adminViewLevel = 'models';
  }
  
  selectAdminModel(modelName: string) {
    this.selectedAdminModel = modelName;
    this.adminViewLevel = 'variants';
  }
  
  goBackAdminLevel() {
    if (this.adminViewLevel === 'variants') {
      this.adminViewLevel = 'models';
      this.selectedAdminModel = null;
    } else if (this.adminViewLevel === 'models') {
      this.adminViewLevel = 'brands';
      this.selectedAdminBrandId = null;
    }
  }
}
