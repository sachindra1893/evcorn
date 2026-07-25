import { Component, OnInit } from '@angular/core';
import { SeoService } from '../../services/seo.service';
import { SchemaService } from '../../services/schema.service';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, BreadcrumbComponent],
  template: `
    <div class="about-page animate-premium-fade">
      
      <!-- Top Header & Breadcrumb -->
      <div class="about-header">
        <app-breadcrumb [paths]="[{label: 'About EVCorn', url: '/about'}]"></app-breadcrumb>
        <span class="hero-badge">OUR MISSION</span>
        <h1 class="gradient-title">Democratizing Electric Mobility in India</h1>
        <p class="subtitle">
          EVCorn is India's premier consumer EV intelligence platform—built to empower buyers with unbiased specifications, real-world range math, and transparent vehicle comparisons.
        </p>
      </div>

      <!-- Core Story Card -->
      <div class="story-section">
        <div class="story-card">
          <h2>Why We Built EVCorn</h2>
          <p>
            The transition to electric vehicles in India is happening faster than ever, but buyers are often bombarded with confusing specs, marketing jargon, and unrealistic claimed ranges. 
          </p>
          <p>
            EVCorn was created to bring absolute clarity to every stage of your EV journey. Whether you are calculating monthly fuel savings, comparing fast-charging speeds across Tata, BYD, MG, and Mahindra, or deciding which battery capacity fits your daily commute—EVCorn delivers accurate, consumer-first data with zero sponsor bias.
          </p>
        </div>
      </div>

      <!-- 4 Core Pillars Grid -->
      <div class="pillars-section">
        <h2 class="section-title">The Four Pillars of EVCorn</h2>
        
        <div class="pillars-grid">
          
          <div class="pillar-card">
            <div class="pillar-icon-bg cyan-glow">⚡</div>
            <h3>Transparent EV Specs</h3>
            <p>
              We break down complex EV specifications—battery chemistry, real-world usable capacity, DC fast-charging intake limits, and ground clearance tailored for Indian roads.
            </p>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon-bg purple-glow">🧮</div>
            <h3>Smart Financial Calculators</h3>
            <p>
              Calculate your exact petrol vs. EV fuel savings, lifetime cost of ownership, and electricity tariff impacts with our interactive financial modeling tools.
            </p>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon-bg emerald-glow">🍃</div>
            <h3>Clean Air Impact</h3>
            <p>
              Visualize the real-world environmental benefit of going electric. Track annual CO₂ emissions saved and see tree-planting equivalencies for a cleaner tomorrow.
            </p>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon-bg pink-glow">📰</div>
            <h3>Unbiased EV Insights</h3>
            <p>
              Deep-dive reviews, long-term battery degradation guides, and real-world range tests covering Tata, BYD, MG, Mahindra, Kia, and Hyundai EVs.
            </p>
          </div>

        </div>
      </div>

      <!-- Impact Stats Bar -->
      <div class="stats-banner">
        <div class="stat-item">
          <span class="stat-num">100%</span>
          <span class="stat-label">Independent & Unbiased</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-num">50+</span>
          <span class="stat-label">EV Models Tracked</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-num">0</span>
          <span class="stat-label">Tailpipe Emissions Mission</span>
        </div>
      </div>

      <!-- Call To Action -->
      <div class="cta-card">
        <h2>Ready to Explore Your Next EV?</h2>
        <p>Compare specifications, calculate fuel savings, and find the perfect electric car for your garage.</p>
        <div class="cta-buttons">
          <a routerLink="/evs" class="primary-btn">Browse EVs →</a>
          <a routerLink="/compare" class="secondary-btn">Compare Specs</a>
        </div>
      </div>

    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');

    .about-page {
      min-height: 90vh;
      background: linear-gradient(180deg, #FAFAFC 0%, #F1F5F9 50%, #ECFDF5 100%);
      padding: clamp(100px, 12vh, 120px) clamp(16px, 5vw, 40px) 80px clamp(16px, 5vw, 40px);
      max-width: 1050px;
      margin: 0 auto;
      color: #1E293B;
    }

    .about-header {
      text-align: center;
      margin-bottom: 4rem;
    }

    .hero-badge {
      display: inline-block;
      padding: 6px 16px;
      background: rgba(2, 132, 199, 0.08);
      color: #0284C7;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      margin-bottom: 1.2rem;
      border: 1px solid rgba(2, 132, 199, 0.18);
    }

    .gradient-title {
      font-size: clamp(2.2rem, 5vw, 3.5rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.2;
      margin-bottom: 1.2rem;
      background: linear-gradient(135deg, #0F172A 0%, #0284C7 50%, #7952FF 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtitle {
      font-size: clamp(1.05rem, 2vw, 1.25rem);
      color: #475569;
      max-width: 750px;
      margin: 0 auto;
      line-height: 1.65;
      font-weight: 400;
    }

    /* Story Section */
    .story-section {
      margin-bottom: 4rem;
    }

    .story-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      border-radius: 24px;
      padding: clamp(2rem, 5vw, 3.5rem);
      border: 1px solid rgba(0, 0, 0, 0.05);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.03);
    }

    .story-card h2 {
      font-size: 1.8rem;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 1.2rem;
      letter-spacing: -0.02em;
    }

    .story-card p {
      font-size: 1.08rem;
      line-height: 1.75;
      color: #334155;
      margin-bottom: 1.2rem;
    }

    .story-card p:last-child {
      margin-bottom: 0;
    }

    /* Pillars Grid */
    .pillars-section {
      margin-bottom: 4rem;
    }

    .section-title {
      font-size: 2rem;
      font-weight: 800;
      color: #0F172A;
      text-align: center;
      margin-bottom: 2.5rem;
      letter-spacing: -0.03em;
    }

    .pillars-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.8rem;
    }

    .pillar-card {
      background: #FFFFFF;
      border-radius: 20px;
      padding: 2rem;
      border: 1px solid rgba(0, 0, 0, 0.04);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.02);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .pillar-card:hover {
      transform: translateY(-6px);
      box-shadow: 0 16px 40px rgba(2, 132, 199, 0.08);
      border-color: rgba(2, 132, 199, 0.2);
    }

    .pillar-icon-bg {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
      margin-bottom: 1.2rem;
    }

    .cyan-glow {
      background: #F0F9FF;
      color: #0284C7;
    }

    .purple-glow {
      background: #F5F3FF;
      color: #7952FF;
    }

    .emerald-glow {
      background: #ECFDF5;
      color: #10B981;
    }

    .pink-glow {
      background: #FDF2F8;
      color: #FF007F;
    }

    .pillar-card h3 {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 0.8rem;
    }

    .pillar-card p {
      font-size: 0.95rem;
      line-height: 1.6;
      color: #64748B;
      margin: 0;
    }

    /* Stats Banner */
    .stats-banner {
      background: #0F172A;
      color: #FFFFFF;
      border-radius: 24px;
      padding: 2.5rem;
      display: flex;
      justify-content: space-around;
      align-items: center;
      flex-wrap: wrap;
      gap: 2rem;
      margin-bottom: 4rem;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
    }

    .stat-item {
      text-align: center;
    }

    .stat-num {
      display: block;
      font-size: 2.8rem;
      font-weight: 800;
      background: linear-gradient(135deg, #00D2FF 0%, #10B981 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 0.9rem;
      color: #94A3B8;
      font-weight: 600;
    }

    .stat-divider {
      width: 1px;
      height: 40px;
      background: rgba(255, 255, 255, 0.1);
    }

    /* CTA Card */
    .cta-card {
      background: linear-gradient(135deg, #0284C7 0%, #7952FF 100%);
      color: #FFFFFF;
      border-radius: 24px;
      padding: clamp(2.5rem, 5vw, 4rem);
      text-align: center;
      box-shadow: 0 20px 45px rgba(2, 132, 199, 0.25);
    }

    .cta-card h2 {
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 0.8rem;
      color: #FFFFFF;
    }

    .cta-card p {
      font-size: 1.1rem;
      opacity: 0.9;
      margin-bottom: 2rem;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .cta-buttons {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .primary-btn {
      background: #FFFFFF;
      color: #0284C7;
      padding: 12px 28px;
      border-radius: 12px;
      font-weight: 800;
      text-decoration: none;
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      }
    }

    .secondary-btn {
      background: rgba(255, 255, 255, 0.15);
      color: #FFFFFF;
      padding: 12px 28px;
      border-radius: 12px;
      font-weight: 700;
      text-decoration: none;
      border: 1px solid rgba(255, 255, 255, 0.3);
      transition: background 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    }

    @media (max-width: 768px) {
      .stat-divider {
        display: none;
      }
      .stats-banner {
        flex-direction: column;
        gap: 1.5rem;
      }
    }
  `]
})
export class AboutComponent implements OnInit {
  constructor(
    private seoService: SeoService,
    private schemaService: SchemaService
  ) {}

  ngOnInit() {
    this.seoService.updateSeo({
      title: 'About Us | EVCorn',
      description: 'Learn about EVCorn, our mission to democratize electric mobility in India, and how we empower EV buyers with transparent specs, savings calculators, and unbiased data.',
      url: 'https://evcorn.com/about'
    });

    this.schemaService.setSchema([
      this.schemaService.buildBreadcrumbs([
        { name: 'Home', url: '' },
        { name: 'About Us', url: '/about' }
      ]),
      this.schemaService.buildWebPage('About Us', 'Learn about EVCorn, our mission to democratize electric mobility in India, and how we empower EV buyers with transparent specs and unbiased data.')
    ]);
  }
}
