import { Component, Input, OnChanges, Inject, Renderer2 } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ArticleBlock } from '../../models/blocks.model';
import { compareHref, modelHref } from '../../entity/entity-href';
import { getOptimizedImageUrl } from '../../utils/image.utils';

@Component({
  selector: 'app-block-renderer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="block-renderer-container">
      <ng-container *ngFor="let block of blocks">
        
        <!-- HEADING -->
        <ng-container *ngIf="block.type === 'heading'">
          <h1 *ngIf="block.data.level === 1" class="block-h1" [id]="block.id">{{ block.data.text }}</h1>
          <h2 *ngIf="block.data.level === 2" class="block-h2" [id]="block.id">{{ block.data.text }}</h2>
          <h3 *ngIf="block.data.level === 3" class="block-h3" [id]="block.id">{{ block.data.text }}</h3>
          <h4 *ngIf="block.data.level === 4" class="block-h4" [id]="block.id">{{ block.data.text }}</h4>
        </ng-container>

        <!-- PARAGRAPH -->
        <p *ngIf="block.type === 'paragraph'" class="block-p" [innerHTML]="autoLink(block.data.text)"></p>

        <!-- IMAGE -->
        <figure *ngIf="block.type === 'image'" class="block-figure">
          <img [src]="optimizeUrl(block.data.url, 960)" [alt]="block.data.alt || block.data.caption || 'Article image'" class="block-img" loading="lazy" decoding="async" width="960" height="540">
          <figcaption *ngIf="block.data.caption" class="block-caption">{{ block.data.caption }}</figcaption>
        </figure>

        <!-- TABLE -->
        <div *ngIf="block.type === 'table'" class="block-table-wrapper">
          <table class="block-table">
            <thead *ngIf="block.data.withHeadings && block.data.content.length > 0">
              <tr>
                <th *ngFor="let th of block.data.content[0]">{{ th }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of (block.data.withHeadings ? block.data.content.slice(1) : block.data.content)">
                <td *ngFor="let cell of row">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- COMPARISON CARDS -->
        <div *ngIf="block.type === 'comparison'" class="block-comparison-grid">
          <div *ngFor="let card of block.data.items" class="comparison-card">
            <div *ngIf="card.highlight" class="card-highlight">{{ card.highlight }}</div>
            <img *ngIf="card.image" [src]="card.image" class="card-img" [alt]="card.title" loading="lazy" decoding="async" width="320" height="200">
            <h3 class="card-title">{{ card.title }}</h3>
            <ul class="card-specs">
              <li *ngFor="let spec of card.specs">
                <span class="spec-label">{{ spec.label }}</span>
                <span class="spec-value">{{ spec.value }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- CALLOUT -->
        <div *ngIf="block.type === 'callout'" class="block-callout" [ngClass]="'callout-' + block.data.style">
          <div class="callout-icon" *ngIf="block.data.icon">{{ block.data.icon }}</div>
          <div class="callout-text" [innerHTML]="block.data.text"></div>
        </div>

        <!-- FAQ -->
        <div *ngIf="block.type === 'faq'" class="block-faq">
          <div *ngFor="let item of block.data.items" class="faq-item">
            <h4 class="faq-q">{{ item.question }}</h4>
            <p class="faq-a" [innerHTML]="item.answer"></p>
          </div>
        </div>

        <!-- PROS & CONS -->
        <div *ngIf="block.type === 'pros-cons'" class="block-pros-cons">
          <div class="pros-panel">
            <div class="pc-header text-success">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <span>Pros</span>
            </div>
            <ul class="pc-list">
              <li *ngFor="let pro of block.data.pros">{{ pro }}</li>
            </ul>
          </div>
          <div class="cons-panel">
            <div class="pc-header text-danger">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg>
              <span>Cons</span>
            </div>
            <ul class="pc-list">
              <li *ngFor="let con of block.data.cons">{{ con }}</li>
            </ul>
          </div>
        </div>

        <!-- LIST -->
        <ul *ngIf="block.type === 'list' && block.data.style === 'unordered'" class="block-ul">
          <li *ngFor="let item of block.data.items" [innerHTML]="item"></li>
        </ul>
        <ol *ngIf="block.type === 'list' && block.data.style === 'ordered'" class="block-ol">
          <li *ngFor="let item of block.data.items" [innerHTML]="item"></li>
        </ol>

        <!-- QUOTE -->
        <blockquote *ngIf="block.type === 'quote'" class="block-quote">
          <p class="quote-text">{{ block.data.text }}</p>
          <footer *ngIf="block.data.author" class="quote-author">— {{ block.data.author }}</footer>
        </blockquote>

        <!-- DIVIDER -->
        <hr *ngIf="block.type === 'divider'" class="block-divider" />

        <!-- CTA -->
        <div *ngIf="block.type === 'cta'" class="block-cta" [ngClass]="'cta-' + block.data.style">
          <p class="cta-text">{{ block.data.text }}</p>
          <a *ngIf="block.data.url.startsWith('http')" [href]="block.data.url" target="_blank" rel="noopener noreferrer" class="cta-btn">{{ block.data.buttonText }}</a>
          <a *ngIf="!block.data.url.startsWith('http')" [routerLink]="block.data.url" class="cta-btn">{{ block.data.buttonText }}</a>
        </div>

        <!-- RELATED CONTENT -->
        <div *ngIf="block.type === 'related'" class="block-related">
          <h4>Related Articles</h4>
          <ul class="related-list">
            <li *ngFor="let articleId of block.data.articleIds">
              <a [routerLink]="['/articles', articleId]" class="related-link">Read More: {{ articleId }}</a>
            </li>
          </ul>
        </div>

        <!-- STATISTICS CARDS -->
        <div *ngIf="block.type === 'statistics'" class="block-statistics">
          <div *ngFor="let stat of block.data.items" class="stat-card">
            <div *ngIf="stat.icon" class="stat-icon">{{ stat.icon }}</div>
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>

        <!-- TIMELINE -->
        <div *ngIf="block.type === 'timeline'" class="block-timeline">
          <div *ngFor="let event of block.data.events" class="timeline-event">
            <div class="timeline-date">{{ event.date }}</div>
            <div class="timeline-content">
              <h4 class="timeline-title">{{ event.title }}</h4>
              <p class="timeline-desc">{{ event.description }}</p>
            </div>
          </div>
        </div>

        <!-- GALLERY -->
        <div *ngIf="block.type === 'gallery'" class="block-gallery" [ngStyle]="{'grid-template-columns': 'repeat(' + block.data.columns + ', 1fr)'}">
          <figure *ngFor="let img of block.data.images" class="gallery-item">
            <img [src]="img.url" [alt]="img.alt || img.caption || 'Gallery Image'" class="gallery-img" loading="lazy" decoding="async" width="800" height="500">
            <figcaption *ngIf="img.caption" class="gallery-caption">{{ img.caption }}</figcaption>
          </figure>
        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    .block-renderer-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      width: 100%;
    }

    /* TYPOGRAPHY */
    .block-h1 { font-size: 2.2rem; color: #1D1D1F; margin-top: 10px; margin-bottom: 5px; }
    .block-h2 { font-size: 1.8rem; color: #1D1D1F; margin-top: 25px; margin-bottom: 5px; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 8px; }
    .block-h3 { font-size: 1.4rem; color: #2D3748; margin-top: 20px; margin-bottom: 5px; }
    .block-h4 { font-size: 1.2rem; color: #4A5568; margin-top: 15px; margin-bottom: 5px; font-weight: 600; }
    
    .block-p {
      font-size: 1.1rem;
      line-height: 1.8;
      color: #333;
      margin: 0;
    }

    /* IMAGES & VIDEO */
    .block-figure, .block-video {
      margin: 10px 0;
      width: 100%;
    }
    .block-img {
      width: 100%;
      border-radius: 12px;
      object-fit: cover;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }
    .video-responsive {
      position: relative;
      padding-bottom: 56.25%; /* 16:9 */
      height: 0;
      overflow: hidden;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }
    .video-responsive iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .block-caption {
      text-align: center;
      font-size: 0.9rem;
      color: #718096;
      margin-top: 10px;
      font-style: italic;
    }

    /* TABLES */
    .block-table-wrapper {
      overflow-x: auto;
      margin: 15px 0;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.03);
      border: 1px solid rgba(0,0,0,0.05);
    }
    .block-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .block-table th, .block-table td {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }
    .block-table th {
      background: #F8F9FA;
      font-weight: 700;
      color: #2D3748;
    }
    .block-table tr:last-child td {
      border-bottom: none;
    }
    .block-table tbody tr:hover {
      background: #F8F9FA;
    }

    /* COMPARISON CARDS */
    .block-comparison-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .comparison-card {
      background: white;
      border: 1px solid rgba(0,0,0,0.06);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.03);
      position: relative;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .comparison-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.06);
    }
    .card-highlight {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: #0088CC;
      color: white;
      padding: 4px 16px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      box-shadow: 0 4px 10px rgba(0, 136, 204, 0.2);
      white-space: nowrap;
    }
    .card-img {
      width: 100%;
      height: 140px;
      object-fit: contain;
      margin-bottom: 15px;
    }
    .card-title {
      font-size: 1.4rem;
      text-align: center;
      margin-bottom: 20px;
      color: #1D1D1F;
    }
    .card-specs {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .card-specs li {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      font-size: 0.95rem;
    }
    .card-specs li:last-child {
      border-bottom: none;
    }
    .spec-label {
      color: #718096;
      font-weight: 500;
    }
    .spec-value {
      color: #2D3748;
      font-weight: 700;
      text-align: right;
    }

    /* CALLOUTS */
    .block-callout {
      display: flex;
      gap: 15px;
      padding: 20px;
      border-radius: 12px;
      margin: 15px 0;
      align-items: flex-start;
    }
    .callout-icon {
      font-size: 1.5rem;
      line-height: 1;
    }
    .callout-text {
      font-size: 1.05rem;
      line-height: 1.6;
    }
    .callout-info { background: #EBF8FF; color: #2B6CB0; border-left: 4px solid #3182CE; }
    .callout-warning { background: #FEFCBF; color: #975A16; border-left: 4px solid #D69E2E; }
    .callout-success { background: #F0FFF4; color: #22543D; border-left: 4px solid #38A169; }
    .callout-danger { background: #FFF5F5; color: #9B2C2C; border-left: 4px solid #E53E3E; }

    /* FAQ */
    .block-faq {
      margin: 20px 0;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .faq-item {
      background: #F8F9FA;
      padding: 20px;
      border-radius: 10px;
      border: 1px solid rgba(0,0,0,0.03);
    }
    .faq-q {
      font-size: 1.15rem;
      color: #2D3748;
      margin: 0 0 10px 0;
    }
    .faq-a {
      font-size: 1.05rem;
      color: #4A5568;
      margin: 0;
      line-height: 1.6;
    }

    /* PROS & CONS */
    .block-pros-cons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
    }
    .pros-panel, .cons-panel {
      background: #F8F9FA;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.04);
    }
    .pc-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.3rem;
      font-weight: 700;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }
    .text-success { color: #38A169; }
    .text-danger { color: #E53E3E; }
    .pc-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .pc-list li {
      position: relative;
      padding-left: 24px;
      margin-bottom: 12px;
      font-size: 1.05rem;
      line-height: 1.5;
      color: #2D3748;
    }
    .pros-panel .pc-list li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #38A169;
      font-weight: bold;
    }
    .cons-panel .pc-list li::before {
      content: '✕';
      position: absolute;
      left: 0;
      color: #E53E3E;
      font-weight: bold;
    }

    /* LISTS */
    .block-ul, .block-ol {
      font-size: 1.1rem;
      line-height: 1.8;
      color: #333;
      padding-left: 24px;
      margin: 10px 0;
    }
    .block-ul li, .block-ol li {
      margin-bottom: 8px;
    }

    /* QUOTE */
    .block-quote {
      margin: 20px 0;
      padding: 24px 30px;
      background: #F7FAFC;
      border-left: 6px solid #0088CC;
      border-radius: 0 12px 12px 0;
    }
    .quote-text {
      font-size: 1.3rem;
      font-style: italic;
      color: #2D3748;
      margin: 0 0 15px 0;
      line-height: 1.6;
    }
    .quote-author {
      font-size: 1.05rem;
      font-weight: 600;
      color: #718096;
    }

    /* DIVIDER */
    .block-divider {
      border: none;
      border-top: 2px solid rgba(0,0,0,0.06);
      margin: 35px 0;
    }

    /* CTA */
    .block-cta {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 40px 30px;
      border-radius: 12px;
      margin: 25px 0;
      gap: 20px;
    }
    .cta-primary { background: #0088CC; color: white; }
    .cta-secondary { background: #2D3748; color: white; }
    .cta-outline { background: transparent; border: 2px solid #0088CC; color: #0088CC; }
    .cta-text {
      font-size: 1.3rem;
      font-weight: 600;
      margin: 0;
      line-height: 1.4;
    }
    .cta-btn {
      display: inline-block;
      padding: 14px 32px;
      border-radius: 30px;
      font-weight: 700;
      text-decoration: none;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .cta-primary .cta-btn, .cta-secondary .cta-btn {
      background: white;
      color: #1D1D1F;
    }
    .cta-outline .cta-btn {
      background: #0088CC;
      color: white;
    }
    .cta-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }

    /* RELATED CONTENT */
    .block-related {
      background: #F8F9FA;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.04);
      margin: 20px 0;
    }
    .block-related h4 {
      margin: 0 0 15px 0;
      font-size: 1.2rem;
      color: #2D3748;
    }
    .related-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .related-link {
      display: inline-block;
      color: #0088CC;
      text-decoration: none;
      font-weight: 600;
      font-size: 1.05rem;
    }
    .related-link:hover {
      text-decoration: underline;
    }

    /* PREMIUM BLOCKS (STATISTICS, TIMELINE, GALLERY) */
    .block-statistics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .stat-card {
      background: linear-gradient(145deg, #ffffff, #f0f4f8);
      border: 1px solid rgba(0, 0, 0, 0.05);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
      transition: transform 0.3s ease;
    }
    .stat-card:hover {
      transform: translateY(-5px);
    }
    .stat-icon {
      font-size: 2.5rem;
      margin-bottom: 12px;
    }
    .stat-value {
      font-size: 2.2rem;
      font-weight: 800;
      color: #111827;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .stat-label {
      font-size: 1rem;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .block-timeline {
      position: relative;
      margin: 30px 0;
      padding-left: 30px;
      border-left: 3px solid #e5e7eb;
    }
    .timeline-event {
      position: relative;
      margin-bottom: 30px;
    }
    .timeline-event:last-child {
      margin-bottom: 0;
    }
    .timeline-event::before {
      content: '';
      position: absolute;
      left: -38px;
      top: 0;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #38bdf8;
      border: 3px solid white;
      box-shadow: 0 0 0 2px #e5e7eb;
    }
    .timeline-date {
      font-size: 0.9rem;
      font-weight: 700;
      color: #38bdf8;
      margin-bottom: 4px;
      letter-spacing: 1px;
    }
    .timeline-title {
      font-size: 1.3rem;
      color: #111827;
      margin: 0 0 8px 0;
    }
    .timeline-desc {
      font-size: 1.05rem;
      color: #4b5563;
      margin: 0;
      line-height: 1.6;
    }

    .block-gallery {
      display: grid;
      gap: 15px;
      margin: 20px 0;
    }
    .gallery-item {
      margin: 0;
      width: 100%;
      height: 100%;
    }
    .gallery-img {
      width: 100%;
      height: 250px;
      object-fit: cover;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      transition: transform 0.3s ease;
    }
    .gallery-img:hover {
      transform: scale(1.02);
    }
    .gallery-caption {
      font-size: 0.85rem;
      color: #6b7280;
      text-align: center;
      margin-top: 8px;
      font-style: italic;
    }

    @media (max-width: 768px) {
      .block-pros-cons {
        grid-template-columns: 1fr;
      }
      .block-gallery {
        grid-template-columns: 1fr 1fr !important; /* Force 2 cols on mobile max */
      }
      .block-h1 { font-size: 1.8rem; }
      .block-h2 { font-size: 1.5rem; }
      .block-p { font-size: 1.05rem; }
      .quote-text { font-size: 1.15rem; }
      .block-cta { padding: 30px 20px; }
      .cta-text { font-size: 1.15rem; }
    }
    @media (max-width: 480px) {
      .block-gallery {
        grid-template-columns: 1fr !important; /* Stack on very small screens */
      }
    }
  `]
})
export class BlockRendererComponent implements OnChanges {
  @Input() blocks: ArticleBlock[] = [];
  @Input() vehicles: any[] = []; // Used for auto internal linking

  constructor(
    private sanitizer: DomSanitizer,
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2
  ) {}

  ngOnChanges() {
    this.injectFaqSchema();
  }

  optimizeUrl(url: string | undefined | null, width?: number): string {
    return getOptimizedImageUrl(url, width);
  }

  // --- Auto Internal Linking ---
  autoLink(text: string): string {
    if (!text || !this.vehicles || this.vehicles.length === 0) return text;
    let linkedText = text;
    const addedModels = new Set<string>();

    for (const v of this.vehicles) {
      if (!v.model) continue;
      const modelRegex = new RegExp(`\\b(${v.brand ? v.brand + ' ' : ''}${v.model})\\b`, 'gi');
      if (!addedModels.has(v.model) && modelRegex.test(linkedText)) {
        // Canonical paths via entity-href SSOT (prefer brand display name).
        const href =
          modelHref({
            brandName: v.brand,
            brandSlug: v.brandSlug,
            parentModel: v.model,
            modelSlug: v.modelSlug
          }) || compareHref([]);
        linkedText = linkedText.replace(
          modelRegex,
          `<a href="${href}" style="color: #0088CC; text-decoration: underline; font-weight: 500;">$1</a>`
        );
        addedModels.add(v.model);
      }
    }
    return linkedText;
  }

  private injectFaqSchema() {
    if (typeof window === 'undefined') return; // Don't manipulate DOM directly in SSR

    // Remove any existing FAQ schema script from this component
    const existingScript = this.document.head.querySelector('script[id="faq-schema"]');
    if (existingScript) {
      this.renderer.removeChild(this.document.head, existingScript);
    }

    const faqBlocks = this.blocks?.filter(b => b.type === 'faq') || [];
    if (faqBlocks.length === 0) return;

    // Aggregate all FAQ items from all FAQ blocks
    const allFaqs = faqBlocks.flatMap(b => (b.data as any).items || []);
    if (allFaqs.length === 0) return;

    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": allFaqs.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer
        }
      }))
    };

    const script = this.renderer.createElement('script');
    this.renderer.setAttribute(script, 'type', 'application/ld+json');
    this.renderer.setAttribute(script, 'id', 'faq-schema');
    this.renderer.setProperty(script, 'text', JSON.stringify(schema));
    this.renderer.appendChild(this.document.head, script);
  }
}
