import {
  Component,
  OnInit,
  AfterViewInit,
  Inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { UserAuthService, EndUser } from '../../services/user-auth.service';
import { Observable } from 'rxjs';

declare var google: any;

@Component({
  selector: 'app-google-signin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="google-user-container">
      <ng-container *ngIf="(currentUser$ | async) as user; else loggedOutTpl">
        <!-- Signed In User View: Avatar, Name & Sign Out -->
        <div class="user-profile-pill">
          <img
            [src]="user.avatarUrl || defaultAvatar"
            [alt]="user.name"
            class="user-avatar"
            (error)="onAvatarError($event)"
          />
          <span class="user-name">{{ user.name }}</span>
          <button (click)="onSignOut()" class="signout-btn" title="Sign out of EVCorn">
            Sign out
          </button>
        </div>
      </ng-container>

      <ng-template #loggedOutTpl>
        <!-- Official Google Sign-In Button Container -->
        <div #googleBtnContainer class="google-btn-wrapper"></div>
      </ng-template>
    </div>
  `,
  styles: [`
    .google-user-container {
      display: flex;
      align-items: center;
    }
    .google-btn-wrapper {
      min-height: 40px;
      display: flex;
      align-items: center;
    }
    .user-profile-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(10px);
      padding: 4px 12px 4px 6px;
      border-radius: 30px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .user-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid rgba(0, 136, 204, 0.3);
    }
    .user-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: #2D3748;
      max-width: 120px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .signout-btn {
      background: rgba(239, 68, 68, 0.1);
      color: #DC2626;
      border: 1px solid rgba(239, 68, 68, 0.2);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .signout-btn:hover {
      background: #DC2626;
      color: #FFFFFF;
    }
  `]
})
export class GoogleSignInComponent implements OnInit, AfterViewInit {
  @ViewChild('googleBtnContainer') googleBtnContainer!: ElementRef;

  currentUser$: Observable<EndUser | null>;
  defaultAvatar = 'https://raw.githubusercontent.com/google/material-design-icons/master/png/social/person/materialicons/24dp/1x/baseline_person_black_24dp.png';

  constructor(
    public userAuthService: UserAuthService,
    @Inject(PLATFORM_ID) private platformId: Object,
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

  private initGoogleIdentity(attempts = 0): void {
    if (typeof window === 'undefined') return;

    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      google.accounts.id.initialize({
        client_id: '712398472912-evcorn-app.apps.googleusercontent.com',
        callback: (response: any) => this.handleCredentialResponse(response),
        auto_select: false
      });

      if (this.googleBtnContainer && this.googleBtnContainer.nativeElement) {
        google.accounts.id.renderButton(
          this.googleBtnContainer.nativeElement,
          {
            type: 'standard',
            theme: 'outline',
            size: 'medium',
            shape: 'pill',
            text: 'signin_with',
            logo_alignment: 'left'
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
        next: (res) => {
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Google login error:', err);
        }
      });
    }
  }

  onSignOut(): void {
    this.userAuthService.logout();
    if (isPlatformBrowser(this.platformId) && typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      google.accounts.id.disableAutoSelect();
    }
    setTimeout(() => {
      this.initGoogleIdentity();
    }, 100);
  }

  onAvatarError(event: any): void {
    event.target.src = this.defaultAvatar;
  }
}
