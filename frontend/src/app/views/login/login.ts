import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <h2>Admin Authentication</h2>
        <p class="subtitle">Enter the password to access the publishing dashboard.</p>
        
        <form (submit)="onSubmit($event)">
          <div class="form-group">
            <label for="password">Security Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              placeholder="••••••••" 
              [(ngModel)]="password"
              required
              autofocus
            >
          </div>

          @if (errorMessage) {
            <p class="error-msg">{{ errorMessage }}</p>
          }

          <button type="submit" class="btn login-btn">Login to Portal</button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 90vh;
      background: #0D1418;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 120px 20px 60px 20px;
    }
    .login-card {
      background: #1A252A;
      border: 1px solid rgba(0, 212, 255, 0.1);
      border-radius: 12px;
      padding: 40px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
      text-align: center;
    }
    h2 {
      font-size: 2rem;
      color: #00D4FF;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 0.95rem;
      color: #A8B2B2;
      margin-bottom: 30px;
      line-height: 1.5;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      text-align: left;
      margin-bottom: 20px;
    }
    label {
      font-size: 0.9rem;
      color: #A8B2B2;
      font-weight: 600;
    }
    input {
      padding: 12px 16px;
      background: #0D1418;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      color: white;
      outline: none;
      font-size: 1rem;
      transition: all 0.3s ease;
    }
    input:focus {
      border-color: #00D4FF;
      box-shadow: 0 0 8px rgba(0, 212, 255, 0.2);
    }
    .error-msg {
      color: #ff4d4d;
      font-size: 0.9rem;
      margin-bottom: 20px;
      text-align: left;
      font-weight: 500;
    }
    .btn {
      padding: 14px;
      border-radius: 6px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      font-size: 1rem;
      width: 100%;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.05rem;
    }
    .login-btn {
      background: #00D4FF;
      color: #0D1418;
    }
    .login-btn:hover {
      background: #00b4db;
      box-shadow: 0 5px 15px rgba(0, 212, 255, 0.25);
    }
  `]
})
export class LoginComponent implements OnInit {
  password = '';
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private metaService: Meta
  ) {}

  ngOnInit() {
    // Prevent Google from indexing the login page
    this.metaService.addTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  onSubmit(event: Event) {
    event.preventDefault();
    this.errorMessage = '';

    if (!this.password) return;

    const success = this.authService.login(this.password);
    if (success) {
      this.password = '';
      this.router.navigate(['/admin']);
    } else {
      this.errorMessage = 'Incorrect password! Please try again.';
      this.password = '';
    }
  }
}
