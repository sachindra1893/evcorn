import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Signal to track login state reactively
  public readonly isAuthenticated = signal<boolean>(false);

  private readonly CONSTANT_PASSWORD = 'admin';

  constructor() {
    // Check if session storage indicates logged in
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const session = sessionStorage.getItem('evcorn_admin_auth');
      if (session === 'true') {
        this.isAuthenticated.set(true);
      }
    }
  }

  login(password: string): boolean {
    if (password === this.CONSTANT_PASSWORD) {
      this.isAuthenticated.set(true);
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('evcorn_admin_auth', 'true');
      }
      return true;
    }
    return false;
  }

  logout(): void {
    this.isAuthenticated.set(false);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem('evcorn_admin_auth');
    }
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }
}
