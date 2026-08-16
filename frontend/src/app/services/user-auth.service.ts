import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { getApiBaseUrl } from '../core/http/api-base-url';

export interface EndUser {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string;
  createdAt?: string;
}

export interface GoogleAuthResponse {
  success: boolean;
  token: string;
  user: EndUser;
}

@Injectable({
  providedIn: 'root'
})
export class UserAuthService {
  private readonly TOKEN_KEY = 'evcorn_user_token';
  private apiUrl = getApiBaseUrl();

  private userTokenSubject = new BehaviorSubject<string | null>(null);
  public userToken$ = this.userTokenSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<EndUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      const storedToken = localStorage.getItem(this.TOKEN_KEY);
      if (storedToken) {
        this.userTokenSubject.next(storedToken);
        this.fetchCurrentUser().subscribe();
      }
    }
  }

  get token(): string | null {
    return this.userTokenSubject.value;
  }

  get currentUser(): EndUser | null {
    return this.currentUserSubject.value;
  }

  loginWithGoogle(credential: string): Observable<GoogleAuthResponse> {
    return this.http.post<GoogleAuthResponse>(`${this.apiUrl}/auth/google`, { credential }).pipe(
      tap((res) => {
        if (res && res.success && res.token) {
          this.setSession(res.token, res.user);
        }
      })
    );
  }

  fetchCurrentUser(): Observable<any> {
    const token = this.token;
    if (!token) return of(null);

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<{ success: boolean; user: EndUser }>(`${this.apiUrl}/auth/me`, { headers }).pipe(
      tap((res) => {
        if (res && res.success && res.user) {
          this.currentUserSubject.next(res.user);
        }
      }),
      catchError(() => {
        this.logout();
        return of(null);
      })
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
    }
    this.userTokenSubject.next(null);
    this.currentUserSubject.next(null);
  }

  private setSession(token: string, user: EndUser): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
    this.userTokenSubject.next(token);
    this.currentUserSubject.next(user);
  }
}
