import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { getApiBaseUrl } from '../core/http/api-base-url';

/**
 * Admin authentication — JWT issued by POST /api/auth/login.
 * Never embeds or compares the admin password in the client bundle.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public readonly isAuthenticated = signal<boolean>(false);

  private readonly TOKEN_KEY = 'evcorn_admin_token';
  private readonly LEGACY_AUTH_FLAG = 'evcorn_admin_auth';
  private token: string | null = null;

  constructor(private readonly http: HttpClient) {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      this.token = sessionStorage.getItem(this.TOKEN_KEY);
      // Drop legacy client-only auth flag (pre–Phase 7) — it is not a credential.
      sessionStorage.removeItem(this.LEGACY_AUTH_FLAG);
      if (this.token) {
        this.isAuthenticated.set(true);
      }
    }
  }

  /**
   * Authenticate against the backend. Returns true only when a JWT is issued.
   */
  login(password: string): Observable<boolean> {
    return this.http
      .post<{ success: boolean; token?: string }>(`${getApiBaseUrl()}/auth/login`, { password })
      .pipe(
        map((res) => {
          if (res?.success && res.token) {
            this.persistToken(res.token);
            return true;
          }
          this.clearSession();
          return false;
        }),
        catchError(() => {
          this.clearSession();
          return of(false);
        })
      );
  }

  logout(): void {
    this.clearSession();
  }

  isLoggedIn(): boolean {
    return Boolean(this.getToken());
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined' && window.sessionStorage) {
      this.token = sessionStorage.getItem(this.TOKEN_KEY);
      if (this.token && !this.isAuthenticated()) {
        this.isAuthenticated.set(true);
      }
    }
    return this.token;
  }

  /** Authorization headers for admin mutations (Bearer JWT only). */
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token) {
      return new HttpHeaders();
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private persistToken(token: string): void {
    this.token = token;
    this.isAuthenticated.set(true);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(this.TOKEN_KEY, token);
      sessionStorage.removeItem(this.LEGACY_AUTH_FLAG);
    }
  }

  private clearSession(): void {
    this.token = null;
    this.isAuthenticated.set(false);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.LEGACY_AUTH_FLAG);
    }
  }
}
