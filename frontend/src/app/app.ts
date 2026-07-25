import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { CompareTrayComponent } from './components/compare-tray/compare-tray';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, Footer, CompareTrayComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  title = 'evcorn-app';
  isRouteReady = false;

  onActivate() {
    // Show footer and other deferred elements once the routed component is active
    this.isRouteReady = true;
  }
}
