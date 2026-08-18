import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GlobalLocationComponent } from '../global-location/global-location.component';
import { GoogleSignInComponent } from '../google-signin/google-signin.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, GlobalLocationComponent, GoogleSignInComponent],
  template: `
    <!-- Top Header: Logo + Admin (if logged in) + Google Sign-In + Location Pill -->
    <div class="header-top-bar">
      <div class="brand-logo-floating" routerLink="/">EVCorn</div>
      
      <div class="header-actions">
        <!-- Show publish/logout on top for mobile/desktop -->
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

    <!-- Desktop & Tablet Navigation Pill -->
    <header class="navbar desktop-nav">
      <nav class="nav-links">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Home</a>
        <a routerLink="/evs" routerLinkActive="active">Browse EVs</a>
        <a routerLink="/articles" routerLinkActive="active">Articles</a>
      </nav>
    </header>

    <!-- Mobile Bottom Navigation Bar -->
    <nav class="mobile-bottom-nav">
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="bottom-nav-item">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">Home</span>
      </a>
      <a routerLink="/evs" routerLinkActive="active" class="bottom-nav-item">
        <span class="nav-icon">🔍</span>
        <span class="nav-label">Browse</span>
      </a>
      <a routerLink="/articles" routerLinkActive="active" class="bottom-nav-item">
        <span class="nav-icon">📖</span>
        <span class="nav-label">Articles</span>
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

    /* Desktop Navigation Pill */
    .desktop-nav {
      position: absolute;
      top: 15px;
      left: 50%;
      transform: translateX(-50%);
      width: auto;
      padding: 0.5rem 1.2rem;
      background: rgba(255, 255, 255, 0.78);
      z-index: 1000;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 40px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.01);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex;
      justify-content: center;
      align-items: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .nav-links {
      display: flex;
      align-items: center;
    }
    .nav-links a {
      margin: 0 0.4rem;
      color: #4A5568;
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 30px;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      display: inline-block;
    }
    .nav-links a:hover {
      color: #0088CC;
      background: rgba(0, 136, 204, 0.05);
    }
    .nav-links a.active {
      color: #0088CC;
      background: rgba(0, 136, 204, 0.08);
    }

    /* Mobile Bottom Navigation (Hidden on Desktop) */
    .mobile-bottom-nav {
      display: none;
    }

    /* Tablet Optimizations */
    @media (min-width: 768px) and (max-width: 1023px) {
      .brand-logo-floating {
        left: 2rem;
        font-size: 2rem;
      }
      .header-actions {
        right: 2rem;
      }
      .desktop-nav {
        padding: 0.4rem 0.8rem;
      }
      .nav-links a {
        margin: 0 0.2rem;
        padding: 6px 12px;
        font-size: 0.85rem;
      }
    }

    /* Mobile Bottom Nav */
    @media (max-width: 767px) {
      .desktop-nav {
        display: none; /* Hide standard nav */
      }

      /* Adjust top header for mobile */
      .brand-logo-floating {
        top: 20px;
        left: 15px;
        font-size: 2rem;
      }
      .header-actions {
        top: 20px;
        right: 15px;
        gap: 14px;
      }
      .admin-links {
        padding: 4px 8px;
      }
      .admin-link {
        font-size: 0.75rem;
      }

      /* Bottom Nav implementation */
      .mobile-bottom-nav {
        display: flex;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 24px 24px 0 0;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
        padding: 8px 10px;
        padding-bottom: calc(8px + env(safe-area-inset-bottom));
        justify-content: space-around;
        align-items: center;
      }

      .bottom-nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        color: #64748B;
        flex: 1;
        padding: 8px 4px;
        border-radius: 16px;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        -webkit-tap-highlight-color: transparent;
      }

      .nav-icon {
        font-size: 1.4rem;
        margin-bottom: 3px;
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        filter: grayscale(100%) opacity(0.6);
      }

      .nav-label {
        font-size: 0.65rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        transition: all 0.2s;
      }

      .bottom-nav-item:active {
        transform: scale(0.95);
        background: rgba(0, 0, 0, 0.02);
      }

      .bottom-nav-item.active {
        color: #0088CC;
        background: rgba(0, 136, 204, 0.08);
      }

      .bottom-nav-item.active .nav-icon {
        filter: grayscale(0%) opacity(1);
        transform: translateY(-2px) scale(1.1);
      }

      .bottom-nav-item.active .nav-label {
        font-weight: 800;
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
    this.router.navigate(['/home']);
  }
}
