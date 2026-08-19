import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GlobalLocationComponent } from '../global-location/global-location.component';
import { GoogleSignInComponent } from '../google-signin/google-signin.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, GlobalLocationComponent, GoogleSignInComponent],
  template: `
    <!-- SVG Brand Gradient Definitions (Shared across icons) -->
    <svg width="0" height="0" class="nav-gradient-defs" aria-hidden="true" style="position: absolute; width: 0; height: 0; overflow: hidden;">
      <defs>
        <linearGradient id="evcorn-nav-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00D2FF"/>
          <stop offset="35%" stop-color="#7952FF"/>
          <stop offset="70%" stop-color="#FF007F"/>
          <stop offset="100%" stop-color="#FF7F00"/>
        </linearGradient>
      </defs>
    </svg>

    <!-- Top Header: Logo + Admin (if logged in) + Google Sign-In + Location Pill -->
    <div class="header-top-bar">
      <div class="brand-logo-floating" routerLink="/">EVCorn</div>
      
      <div class="header-actions">
        @if (authService.isAuthenticated()) {
          <div class="admin-links">
            <a routerLink="/admin" class="admin-link">Publish</a>
            <a href="#" (click)="onLogout($event)" class="admin-link logout-link">Logout</a>
          </div>
        }
        <app-global-location></app-global-location>
        <div class="nav-divider"></div>
        <app-google-signin></app-google-signin>
      </div>
    </div>

    <!-- Desktop & Tablet Navigation: Minimal Hover-Reveal Icon Navigation -->
    <header class="navbar desktop-nav" aria-label="Main Navigation">
      <nav class="nav-links">
        <!-- Home -->
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item" aria-label="Home" title="Home">
          <span class="nav-icon-wrap">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </span>
          <span class="nav-label">Home</span>
          <span class="active-indicator"></span>
        </a>

        <!-- Cars -->
        <a routerLink="/evs" routerLinkActive="active" class="nav-item" aria-label="Cars" title="Cars">
          <span class="nav-icon-wrap">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H7c-.6 0-1.1.2-1.5.6L3.2 10.1C2.5 10.4 2 11.2 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <path d="M9 17h6"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          </span>
          <span class="nav-label">Cars</span>
          <span class="active-indicator"></span>
        </a>

        <!-- Two-Wheelers -->
        <a routerLink="/two-wheelers" routerLinkActive="active" class="nav-item" aria-label="Two-Wheelers" title="Two-Wheelers">
          <span class="nav-icon-wrap">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="5.5" cy="17.5" r="2.5"/>
              <circle cx="18.5" cy="17.5" r="2.5"/>
              <path d="M15 6h3.5"/>
              <path d="M17 6l-3.5 11.5H8.5L6.5 11h4"/>
              <path d="M8 17.5h8"/>
              <path d="M10 8l2-2"/>
            </svg>
          </span>
          <span class="nav-label">Two-Wheelers</span>
          <span class="active-indicator"></span>
        </a>

        <!-- Insights -->
        <a routerLink="/articles" routerLinkActive="active" class="nav-item" aria-label="Insights" title="Insights">
          <span class="nav-icon-wrap">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              <line x1="9" y1="7" x2="15" y2="7"/>
              <line x1="9" y1="11" x2="15" y2="11"/>
            </svg>
          </span>
          <span class="nav-label">Insights</span>
          <span class="active-indicator"></span>
        </a>
      </nav>
    </header>

    <!-- Mobile Bottom Navigation Bar (4 clearly labeled destinations) -->
    <nav class="mobile-bottom-nav" aria-label="Mobile Navigation">
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="bottom-nav-item" aria-label="Home">
        <span class="bottom-nav-icon-wrap">
          <svg class="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </span>
        <span class="bottom-nav-label">Home</span>
        <span class="bottom-active-indicator"></span>
      </a>

      <a routerLink="/evs" routerLinkActive="active" class="bottom-nav-item" aria-label="Cars">
        <span class="bottom-nav-icon-wrap">
          <svg class="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H7c-.6 0-1.1.2-1.5.6L3.2 10.1C2.5 10.4 2 11.2 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
        </span>
        <span class="bottom-nav-label">Cars</span>
        <span class="bottom-active-indicator"></span>
      </a>

      <a routerLink="/two-wheelers" routerLinkActive="active" class="bottom-nav-item" aria-label="Two-Wheelers">
        <span class="bottom-nav-icon-wrap">
          <svg class="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="5.5" cy="17.5" r="2.5"/>
            <circle cx="18.5" cy="17.5" r="2.5"/>
            <path d="M15 6h3.5"/>
            <path d="M17 6l-3.5 11.5H8.5L6.5 11h4"/>
            <path d="M8 17.5h8"/>
            <path d="M10 8l2-2"/>
          </svg>
        </span>
        <span class="bottom-nav-label">2-Wheelers</span>
        <span class="bottom-active-indicator"></span>
      </a>

      <a routerLink="/articles" routerLinkActive="active" class="bottom-nav-item" aria-label="Insights">
        <span class="bottom-nav-icon-wrap">
          <svg class="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            <line x1="9" y1="7" x2="15" y2="7"/>
            <line x1="9" y1="11" x2="15" y2="11"/>
          </svg>
        </span>
        <span class="bottom-nav-label">Insights</span>
        <span class="bottom-active-indicator"></span>
      </a>
    </nav>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');

    /* Desktop / Global Top Bar */
    .brand-logo-floating {
      position: absolute;
      top: 15px;
      left: 4.5rem;
      z-index: 1001; 
      font-family: 'Pacifico', cursive;
      font-size: 2.5rem;
      cursor: pointer;
      text-decoration: none;
      user-select: none;
      background: linear-gradient(to right, #00D2FF 0%, #7952FF 35%, #FF007F 70%, #FF7F00 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.2;
      display: inline-block;
      padding-bottom: 2px;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .brand-logo-floating:hover {
      transform: scale(1.05);
    }

    .header-actions {
      position: absolute;
      top: 25px;
      right: 4.5rem;
      z-index: 1001;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .nav-divider {
      width: 1px;
      height: 16px;
      background-color: #CBD5E1;
      flex-shrink: 0;
      align-self: center;
    }
    .admin-links {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid rgba(0,0,0,0.05);
    }
    .admin-link {
      font-size: 0.85rem;
      font-weight: 700;
      color: #4A5568;
      text-decoration: none;
      transition: color 0.2s;
    }
    .admin-link:hover { color: #0088CC; }
    .logout-link { color: #EF4444; }
    .logout-link:hover { color: #B91C1C; }

    /* ==========================================================================
       Desktop Minimal Icon-First Navigation with Hover-Reveal Label
       ========================================================================== */
    .desktop-nav {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .nav-links {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      background: rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(0, 0, 0, 0.05);
      border-radius: 999px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .nav-item {
      position: relative;
      display: inline-flex;
      align-items: center;
      padding: 7px 11px;
      border-radius: 999px;
      text-decoration: none;
      color: #64748B;
      font-size: 0.88rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      transition: background 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                  color 0.22s ease,
                  padding 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
      outline: none;
      -webkit-user-select: none;
      user-select: none;
    }

    .nav-item:focus-visible {
      box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.35);
    }

    .nav-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }

    .nav-icon {
      width: 20px;
      height: 20px;
      stroke: #64748B;
      transition: stroke 0.22s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Label reveal on hover & active */
    .nav-label {
      display: inline-block;
      max-width: 0;
      opacity: 0;
      overflow: hidden;
      white-space: nowrap;
      margin-left: 0;
      line-height: 1;
      transition: max-width 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                  opacity 0.18s ease,
                  margin 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Active Indicator Underneath Item */
    .active-indicator {
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 2px;
      border-radius: 99px;
      background: linear-gradient(90deg, #00D2FF 0%, #7952FF 40%, #FF007F 80%, #FF7F00 100%);
      opacity: 0;
      transition: width 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                  opacity 0.2s ease;
    }

    /* Hover State (Desktop) */
    .nav-item:hover {
      color: #0F172A;
      background: rgba(2, 132, 199, 0.05);
      padding: 7px 14px;
    }

    .nav-item:hover .nav-icon {
      stroke: url(#evcorn-nav-grad);
      transform: scale(1.06);
    }

    .nav-item:hover .nav-label {
      max-width: 120px;
      opacity: 1;
      margin-left: 7px;
    }

    /* Active State (Desktop) */
    .nav-item.active {
      color: #0F172A;
      background: linear-gradient(135deg, rgba(0, 210, 255, 0.08) 0%, rgba(121, 82, 255, 0.08) 100%);
      padding: 7px 14px;
      font-weight: 700;
    }

    .nav-item.active .nav-icon {
      stroke: url(#evcorn-nav-grad);
      transform: scale(1.05);
    }

    .nav-item.active .nav-label {
      max-width: 120px;
      opacity: 1;
      margin-left: 7px;
      background: linear-gradient(135deg, #00D2FF 0%, #7952FF 40%, #FF007F 80%, #FF7F00 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 700;
    }

    .nav-item.active .active-indicator {
      opacity: 1;
      width: 18px;
    }

    /* ==========================================================================
       Mobile Bottom Navigation (Hidden on Desktop)
       ========================================================================== */
    .mobile-bottom-nav {
      display: none;
    }

    /* Tablet Optimizations */
    @media (min-width: 768px) and (max-width: 1023px) {
      .brand-logo-floating {
        left: 2rem;
        font-size: 2.1rem;
      }
      .header-actions {
        right: 2rem;
      }
      .desktop-nav {
        top: 18px;
      }
      .nav-links {
        gap: 4px;
        padding: 3px 5px;
      }
      .nav-item {
        padding: 6px 9px;
        font-size: 0.82rem;
      }
      .nav-item:hover, .nav-item.active {
        padding: 6px 12px;
      }
    }

    /* ==========================================================================
       Mobile Styles (<= 767px)
       ========================================================================== */
    @media (max-width: 767px) {
      .desktop-nav {
        display: none;
      }

      .brand-logo-floating {
        top: 20px;
        left: 15px;
        font-size: 2rem;
      }
      .header-actions {
        top: 20px;
        right: 15px;
        gap: 12px;
      }
      .admin-links {
        padding: 4px 8px;
      }
      .admin-link {
        font-size: 0.75rem;
      }

      /* Fixed Mobile Bottom Navigation Bar */
      .mobile-bottom-nav {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 20px 20px 0 0;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
        padding: 6px 4px;
        padding-bottom: calc(6px + env(safe-area-inset-bottom));
        align-items: center;
      }

      .bottom-nav-item {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        padding: 5px 2px;
        border-radius: 12px;
        text-decoration: none;
        color: #64748B;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        -webkit-tap-highlight-color: transparent;
      }

      .bottom-nav-icon-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        margin-bottom: 2px;
      }

      .bottom-nav-icon {
        width: 22px;
        height: 22px;
        stroke: #64748B;
        transition: stroke 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .bottom-nav-label {
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        line-height: 1.1;
        transition: all 0.2s ease;
        white-space: nowrap;
      }

      .bottom-active-indicator {
        position: absolute;
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 2px;
        border-radius: 99px;
        background: linear-gradient(90deg, #00D2FF 0%, #7952FF 40%, #FF007F 80%, #FF7F00 100%);
        opacity: 0;
        transition: width 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                    opacity 0.2s ease;
      }

      .bottom-nav-item:active {
        transform: scale(0.95);
      }

      .bottom-nav-item.active {
        color: #0F172A;
      }

      .bottom-nav-item.active .bottom-nav-icon {
        stroke: url(#evcorn-nav-grad);
        transform: translateY(-1px) scale(1.05);
      }

      .bottom-nav-item.active .bottom-nav-label {
        background: linear-gradient(135deg, #00D2FF 0%, #7952FF 40%, #FF007F 80%, #FF7F00 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 700;
      }

      .bottom-nav-item.active .bottom-active-indicator {
        opacity: 1;
        width: 16px;
      }
    }
  `]
})
export class Navbar {
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  onLogout(event: Event) {
    event.preventDefault();
    this.authService.logout();
    alert('Logged out successfully!');
    this.router.navigate(['/']);
  }
}
