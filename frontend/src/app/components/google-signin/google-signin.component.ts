import {
  Component,
  OnInit,
  AfterViewInit,
  Inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  HostListener
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { UserAuthService, EndUser } from '../../services/user-auth.service';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

declare var google: any;

@Component({
  selector: 'app-google-signin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="google-auth-widget">
      <!-- Signed In State -->
      <ng-container *ngIf="(currentUser$ | async) as user; else loggedOutTpl">
        <div class="avatar-wrapper">
          <button
            type="button"
            class="avatar-trigger-btn"
            (click)="toggleDropdown($event)"
            [attr.aria-expanded]="dropdownOpen"
            title="User Account"
          >
            <img
              *ngIf="user.avatarUrl && !avatarHasError"
              [src]="user.avatarUrl"
              [alt]="user.name || 'User Avatar'"
              class="avatar-img"
              (error)="onAvatarError()"
            />
            <div *ngIf="!user.avatarUrl || avatarHasError" class="avatar-initial">
              {{ getInitial(user.name, user.email) }}
            </div>
          </button>

          <!-- Floating Right-Aligned Dropdown Panel -->
          <div class="dropdown-panel" *ngIf="dropdownOpen">
            <div class="dropdown-user-header">
              <img
                *ngIf="user.avatarUrl && !avatarHasError"
                [src]="user.avatarUrl"
                [alt]="user.name || 'User Avatar'"
                class="header-avatar-img"
                (error)="onAvatarError()"
              />
              <div *ngIf="!user.avatarUrl || avatarHasError" class="header-avatar-initial">
                {{ getInitial(user.name, user.email) }}
              </div>
              <div class="header-user-details">
                <span class="user-display-name">{{ user.name || 'EVCorn User' }}</span>
                <span class="user-display-email">{{ user.email }}</span>
              </div>
            </div>

            <div class="dropdown-divider"></div>

            <button type="button" class="dropdown-action-btn signout-btn" (click)="onSignOut($event)">
              <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </ng-container>

      <!-- Logged Out State: 32px Circular Outlined Button -->
      <ng-template #loggedOutTpl>
        <div class="circle-btn-container" (click)="onCircleClick()" title="Sign in with Google">
          <button type="button" class="circle-signin-btn" aria-label="Sign in with Google">
            <svg class="user-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </button>

          <!-- Hidden Google Identity Overlay Container -->
          <div #googleBtnContainer class="gis-overlay"></div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      flex-shrink: 0;
      vertical-align: middle;
    }

    .google-auth-widget {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      aspect-ratio: 1 / 1;
    }

    /* Logged Out: 32px Circular Outlined Button */
    .circle-btn-container {
      position: relative;
      width: 32px;
      height: 32px;
      min-width: 32px;
      max-width: 32px;
      min-height: 32px;
      max-height: 32px;
      aspect-ratio: 1 / 1;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-sizing: border-box;
    }

    .circle-signin-btn {
      width: 32px;
      height: 32px;
      min-width: 32px;
      max-width: 32px;
      min-height: 32px;
      max-height: 32px;
      aspect-ratio: 1 / 1;
      flex-shrink: 0;
      border-radius: 50%;
      border: 1.5px solid #0088CC;
      background: transparent;
      color: #0088CC;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0;
      cursor: pointer;
      box-sizing: border-box;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
    }

    .circle-signin-btn:hover {
      background: rgba(0, 136, 204, 0.08);
      border-color: #006699;
      color: #006699;
      transform: scale(1.05);
    }

    .circle-signin-btn:active {
      transform: scale(0.95);
    }

    .user-icon {
      width: 17px;
      height: 17px;
    }

    /* Invisible GIS overlay container over the 32px button for native click handling */
    .gis-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 32px;
      height: 32px;
      opacity: 0.001;
      overflow: hidden;
      z-index: 5;
      cursor: pointer;
    }

    .gis-overlay ::ng-deep iframe {
      width: 200px !important;
      height: 100px !important;
      margin-top: -30px;
      margin-left: -30px;
      cursor: pointer !important;
    }

    /* Logged In Avatar */
    .avatar-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      min-width: 32px;
      max-width: 32px;
      min-height: 32px;
      max-height: 32px;
      aspect-ratio: 1 / 1;
      flex-shrink: 0;
    }

    .avatar-trigger-btn {
      width: 32px;
      height: 32px;
      min-width: 32px;
      max-width: 32px;
      min-height: 32px;
      max-height: 32px;
      aspect-ratio: 1 / 1;
      flex-shrink: 0;
      border-radius: 50%;
      border: 1.5px solid rgba(0, 136, 204, 0.4);
      background: transparent;
      padding: 0;
      margin: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      box-sizing: border-box;
      transition: all 0.2s ease;
      outline: none;
    }

    .avatar-trigger-btn:hover {
      border-color: #0088CC;
      transform: scale(1.05);
      box-shadow: 0 0 0 3px rgba(0, 136, 204, 0.15);
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      min-width: 100%;
      min-height: 100%;
      object-fit: cover;
      object-position: center;
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      display: block;
      flex-shrink: 0;
    }

    .avatar-initial {
      width: 100%;
      height: 100%;
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      background: linear-gradient(135deg, #0088CC 0%, #005580 100%);
      color: #FFFFFF;
      font-size: 0.85rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      flex-shrink: 0;
    }

    /* Floating Right-Aligned Dropdown Panel */
    .dropdown-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 220px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04);
      padding: 12px;
      z-index: 2000;
      animation: dropdownFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes dropdownFadeIn {
      from {
        opacity: 0;
        transform: translateY(-6px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .dropdown-user-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 6px;
    }

    .header-avatar-img {
      width: 36px;
      height: 36px;
      min-width: 36px;
      min-height: 36px;
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      object-fit: cover;
      object-position: center;
      flex-shrink: 0;
      border: 1px solid rgba(0, 136, 204, 0.2);
    }

    .header-avatar-initial {
      width: 36px;
      height: 36px;
      min-width: 36px;
      min-height: 36px;
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      background: linear-gradient(135deg, #0088CC 0%, #005580 100%);
      color: #FFFFFF;
      font-size: 0.95rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      user-select: none;
    }

    .header-user-details {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .user-display-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: #1A202C;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-display-email {
      font-size: 0.76rem;
      color: #718096;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
    }

    .dropdown-divider {
      height: 1px;
      background: rgba(0, 0, 0, 0.08);
      margin: 10px 0;
    }

    .dropdown-action-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border: none;
      background: transparent;
      border-radius: 10px;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .signout-btn {
      color: #EF4444;
    }

    .signout-btn:hover {
      background: rgba(239, 68, 68, 0.08);
      color: #DC2626;
    }

    .action-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
  `]
})
export class GoogleSignInComponent implements OnInit, AfterViewInit {
  @ViewChild('googleBtnContainer') googleBtnContainer!: ElementRef;

  currentUser$: Observable<EndUser | null>;
  dropdownOpen = false;
  avatarHasError = false;

  constructor(
    public userAuthService: UserAuthService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUser$ = this.userAuthService.currentUser$;
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initGoogleIdentity();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (
      this.dropdownOpen &&
      this.elementRef &&
      !this.elementRef.nativeElement.contains(event.target)
    ) {
      this.dropdownOpen = false;
      this.cdr.detectChanges();
    }
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  getInitial(name?: string, email?: string): string {
    if (name && name.trim().length > 0) {
      return name.trim().charAt(0).toUpperCase();
    }
    if (email && email.trim().length > 0) {
      return email.trim().charAt(0).toUpperCase();
    }
    return 'U';
  }

  onAvatarError(): void {
    this.avatarHasError = true;
    this.cdr.detectChanges();
  }

  onCircleClick(): void {
    if (isPlatformBrowser(this.platformId) && typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      google.accounts.id.prompt();
    }
  }

  private initGoogleIdentity(attempts = 0): void {
    if (typeof window === 'undefined') return;

    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: any) => this.handleCredentialResponse(response),
        auto_select: false
      });

      if (this.googleBtnContainer && this.googleBtnContainer.nativeElement) {
        google.accounts.id.renderButton(
          this.googleBtnContainer.nativeElement,
          {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            shape: 'pill'
          }
        );
      }
    } else if (attempts < 20) {
      setTimeout(() => this.initGoogleIdentity(attempts + 1), 200);
    }
  }

  handleCredentialResponse(response: any): void {
    if (response && response.credential) {
      this.userAuthService.loginWithGoogle(response.credential).subscribe({
        next: () => {
          this.dropdownOpen = false;
          this.avatarHasError = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Google login error:', err);
        }
      });
    }
  }

  onSignOut(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOpen = false;
    this.userAuthService.logout();
    if (isPlatformBrowser(this.platformId) && typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      google.accounts.id.disableAutoSelect();
    }
    setTimeout(() => {
      this.initGoogleIdentity();
    }, 100);
  }
}
