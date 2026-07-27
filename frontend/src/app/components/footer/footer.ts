import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      
      <!-- Ambient Pastel Vector Ribbon Flow (SVG Waves) -->
      <div class="ribbon-bg">
        <svg viewBox="0 0 1440 450" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M-100 120 C 300 20, 600 220, 1000 100 C 1300 20, 1500 180, 1800 80" stroke="#00D2FF" stroke-width="1.8" stroke-opacity="0.25" stroke-linecap="round"/>
          <path d="M-50 220 C 250 320, 700 80, 1100 260 C 1350 360, 1550 200, 1800 300" stroke="#FF007F" stroke-width="1.5" stroke-opacity="0.2" stroke-linecap="round"/>
          <path d="M-200 320 C 400 220, 800 380, 1200 220 C 1450 120, 1600 280, 1900 200" stroke="#7952FF" stroke-width="1.5" stroke-opacity="0.2" stroke-linecap="round"/>
          <path d="M0 60 C 400 200, 900 60, 1300 280 C 1500 420, 1700 150, 1900 220" stroke="#10B981" stroke-width="1.2" stroke-opacity="0.22" stroke-linecap="round"/>
        </svg>
      </div>

      <!-- Full-Section Blended Watermark Backdrop (Stretches across entire footer) -->
      <div class="full-watermark-backdrop">
        <span class="giant-watermark-text">EVCorn</span>
      </div>

      <!-- Top Brand Gradient Accent Border Line -->
      <div class="top-gradient-bar"></div>

      <div class="footer-container">
        
        <!-- Top Row: Brand Info & Social Connections -->
        <div class="footer-top-row">
          <div class="footer-brand-col">
            <a class="footer-logo" routerLink="/">EVCorn</a>
            <p class="brand-tagline">
              India's leading consumer electric vehicle platform. Helping you discover, compare, and drive the zero-emission future.
            </p>
          </div>
          
          <div class="footer-social-col">
            <span class="col-title">Connect With Us</span>
            <div class="social-links-row">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" class="social-circle fb-circle" title="Facebook">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="https://x.com/evcorn_com" target="_blank" rel="noopener noreferrer" class="social-circle x-circle" title="X (Twitter)">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div class="footer-divider"></div>

        <!-- 4-Column Navigation Grid (Desktop: Grid, Mobile: Smart Accordion) -->
        <div class="footer-grid">
          
          <!-- Col 1: Explore EVs -->
          <div class="footer-col" [class.is-open]="isSectionOpen('explore')">
            <div class="col-header" (click)="toggleSection('explore')">
              <span class="col-title">Explore EVs</span>
              <span class="accordion-toggle-btn">{{ isSectionOpen('explore') ? '−' : '+' }}</span>
            </div>
            <ul class="col-links-list">
              <li><a routerLink="/evs">Browse All EVs</a></li>
              <li><a routerLink="/evs" [queryParams]="{ brand: 'tata' }">Tata Motors EVs</a></li>
              <li><a routerLink="/evs" [queryParams]="{ brand: 'byd' }">BYD Electric Cars</a></li>
              <li><a routerLink="/evs" [queryParams]="{ brand: 'mg' }">MG Electric Lineup</a></li>
              <li><a routerLink="/compare">Compare EV Specs</a></li>
            </ul>
          </div>

          <!-- Col 2: EV Calculators -->
          <div class="footer-col" [class.is-open]="isSectionOpen('calculators')">
            <div class="col-header" (click)="toggleSection('calculators')">
              <span class="col-title">EV Calculators</span>
              <span class="accordion-toggle-btn">{{ isSectionOpen('calculators') ? '−' : '+' }}</span>
            </div>
            <ul class="col-links-list">
              <li><a routerLink="/energy">EV Savings Calculator</a></li>
              <li><a routerLink="/energy">Charging & Solar ROI</a></li>
              <li><a routerLink="/home" fragment="emissions">Clean Air CO₂ Impact</a></li>
              <li><a routerLink="/articles">Latest EV News & Insights</a></li>
            </ul>
          </div>

          <!-- Col 3: Company -->
          <div class="footer-col" [class.is-open]="isSectionOpen('company')">
            <div class="col-header" (click)="toggleSection('company')">
              <span class="col-title">Company</span>
              <span class="accordion-toggle-btn">{{ isSectionOpen('company') ? '−' : '+' }}</span>
            </div>
            <ul class="col-links-list">
              <li><a routerLink="/about">About Us</a></li>
              <li><a routerLink="/contact">Get in Touch</a></li>
              <li><a routerLink="/feedback">Send Feedback</a></li>
              <li><a routerLink="/advertise">Advertise With Us</a></li>
            </ul>
          </div>

          <!-- Col 4: Legal & Trust -->
          <div class="footer-col" [class.is-open]="isSectionOpen('legal')">
            <div class="col-header" (click)="toggleSection('legal')">
              <span class="col-title">Legal & Trust</span>
              <span class="accordion-toggle-btn">{{ isSectionOpen('legal') ? '−' : '+' }}</span>
            </div>
            <ul class="col-links-list">
              <li><a routerLink="/privacy">Privacy Policy</a></li>
              <li><a routerLink="/terms">Terms & Conditions</a></li>
              <li><a routerLink="/faqs">Frequently Asked Questions</a></li>
            </ul>
          </div>

        </div>

        <div class="footer-bottom-row">
          <p class="copyright-text">© 2026 EVCorn. All rights reserved.</p>
        </div>

      </div>

    </footer>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');

    .footer {
      background: linear-gradient(135deg, #F8FAFC 0%, #F0F9FF 28%, #F5F3FF 58%, #FDF2F8 82%, #ECFDF5 100%);
      position: relative;
      overflow: hidden;
      color: #1E293B;
      padding-top: 4.5rem;
      padding-bottom: 2.5rem;
    }

    .top-gradient-bar {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: linear-gradient(90deg, #00D2FF 0%, #7952FF 35%, #FF007F 70%, #FF7F00 100%);
      z-index: 10;
    }

    .ribbon-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
      opacity: 0.85;
    }

    .ribbon-bg svg {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Full-Section Blended Watermark Backdrop */
    .full-watermark-backdrop {
      position: absolute;
      top: 55%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
    }

    .giant-watermark-text {
      font-family: 'Pacifico', cursive;
      font-size: clamp(8rem, 25vw, 24rem);
      line-height: 0.9;
      user-select: none;
      background: linear-gradient(135deg, rgba(0, 210, 255, 0.08) 0%, rgba(121, 82, 255, 0.08) 35%, rgba(255, 0, 127, 0.08) 70%, rgba(255, 127, 0, 0.08) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.02em;
      text-align: center;
      white-space: nowrap;
      filter: drop-shadow(0 10px 30px rgba(0,210,255,0.03));
    }

    .footer-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 2rem;
      position: relative;
      z-index: 2;
    }

    .footer-top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 3rem;
      flex-wrap: wrap;
      margin-bottom: 2.5rem;
    }

    .footer-brand-col {
      max-width: 450px;
    }

    .footer-logo {
      font-family: 'Pacifico', cursive;
      font-size: 2.8rem;
      text-decoration: none;
      user-select: none;
      background: linear-gradient(to right, #00D2FF 0%, #7952FF 35%, #FF007F 70%, #FF7F00 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.2;
      display: inline-block;
      margin-bottom: 0.8rem;
    }

    .brand-tagline {
      font-size: 0.98rem;
      line-height: 1.65;
      color: #475569;
      font-weight: 400;
    }

    .col-title {
      font-size: 0.88rem;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .col-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.2rem;
    }

    .accordion-toggle-btn {
      display: none; /* Hidden on desktop */
      font-size: 1.2rem;
      font-weight: 700;
      color: #0284C7;
    }

    .social-links-row {
      display: flex;
      gap: 1rem;
    }

    .social-circle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      color: #FFFFFF;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
    }

    .social-circle:hover {
      transform: translateY(-3px) scale(1.08);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.14);
    }

    .fb-circle {
      background: #1877F2;
    }

    .x-circle {
      background: #0F172A;
    }

    .footer-divider {
      width: 100%;
      height: 1px;
      background: linear-gradient(90deg, rgba(0,210,255,0.15), rgba(121,82,255,0.15), rgba(255,0,127,0.15));
      margin-bottom: 3rem;
    }

    .footer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 2.5rem 2rem;
      margin-bottom: 3rem;
    }

    .footer-col ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .footer-col li {
      margin-bottom: 0.8rem;
    }

    .footer-col a {
      color: #475569;
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 500;
      transition: color 0.2s ease, transform 0.2s ease;
      display: inline-block;
    }

    .footer-col a:hover {
      color: #0284C7;
      transform: translateX(3px);
    }

    .footer-bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
    }

    .copyright-text {
      font-size: 0.88rem;
      color: #64748B;
      margin: 0;
      font-weight: 500;
    }

    /* MOBILE SPECIFIC ACCORDION STYLES */
    @media (max-width: 768px) {
      .footer {
        padding-top: 3rem;
        padding-bottom: 5.5rem; /* Extra padding for floating navigation bar */
      }
      .footer-container {
        padding: 0 1.2rem;
      }
      .footer-top-row {
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 2rem;
      }
      .footer-divider {
        margin-bottom: 1.5rem;
      }
      
      /* Switch grid to vertical accordion stack on phone */
      .footer-grid {
        display: flex;
        flex-direction: column;
        gap: 0;
        margin-bottom: 2rem;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }

      .footer-col {
        border-top: 1px solid rgba(0, 0, 0, 0.06);
        padding: 1rem 0;
      }

      .col-header {
        margin-bottom: 0;
        cursor: pointer;
        user-select: none;
      }

      .accordion-toggle-btn {
        display: inline-block; /* Show + / - on phone */
      }

      .col-links-list {
        display: none; /* Collapsed by default on mobile */
        padding-top: 1rem !important;
      }

      .footer-col.is-open .col-links-list {
        display: block; /* Expanded on tap */
        animation: fadeIn 0.25s ease-in-out;
      }

      .giant-watermark-text {
        font-size: 5rem;
      }
      
      .full-watermark-backdrop {
        top: 70%;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class Footer {
  openSections = new Set<string>();

  toggleSection(sectionId: string) {
    if (this.openSections.has(sectionId)) {
      this.openSections.delete(sectionId);
    } else {
      this.openSections.add(sectionId);
    }
  }

  isSectionOpen(sectionId: string): boolean {
    return this.openSections.has(sectionId);
  }
}
