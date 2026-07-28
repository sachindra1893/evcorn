import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { CompareTrayComponent } from './components/compare-tray/compare-tray';
import { BlogDataService } from './services/blog-data.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Navbar, Footer, CompareTrayComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  title = 'evcorn-app';
  isRouteReady = false;

  // Root-Cause Cluster F (frontend handling): surfaced globally so any page's
  // failed/slow request during a backend cold-start shows a clear "waking up"
  // message instead of silently rendering as an empty/blank section.
  readonly isBackendWaking$: Observable<boolean>;

  constructor(private blogData: BlogDataService) {
    this.isBackendWaking$ = this.blogData.isRetrying$;
  }

  onActivate() {
    // Show footer and other deferred elements once the routed component is active
    this.isRouteReady = true;
  }
}
