import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { SchemaService } from '../../services/schema.service';

@Component({
  selector: 'app-info',
  standalone: true,
  template: `
    <div class="info-page">
      <div class="info-section">
        <h1>{{ title }}</h1>
        <div class="info-content" [innerHTML]="content"></div>
      </div>
    </div>
  `,
  styles: [`
    .info-page {
      min-height: 80vh;
      background: #F8F9FA;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 120px 20px 60px 20px;
    }
    .info-section {
      max-width: 800px;
      width: 100%;
      margin: 0 auto;
      padding: 3rem;
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
    }
    h1 {
      font-size: 2.8rem;
      color: #1A202C;
      margin-bottom: 2rem;
      text-align: center;
    }
    .info-content {
      font-size: 1.1rem;
      line-height: 1.8;
      color: #2D3748;
    }
    ::ng-deep .info-content p {
      margin-bottom: 1.2rem;
    }
    ::ng-deep .info-content h2 {
      color: #0088CC;
      margin-top: 1.5rem;
      margin-bottom: 0.8rem;
      font-size: 1.5rem;
    }
    ::ng-deep .info-content strong {
      color: #0088CC;
    }
    @media (max-width: 768px) {
      .info-section {
        padding: 1.5rem;
      }
      h1 {
        font-size: 2rem;
      }
    }
  `]
})
export class InfoComponent implements OnInit {
  title = '';
  content = '';

  constructor(
    private route: ActivatedRoute,
    private seoService: SeoService,
    private schemaService: SchemaService
  ) {}

  ngOnInit() {
    this.route.url.subscribe(urlSegments => {
      const path = urlSegments[0]?.path || '';
      this.setupContent(path);
    });
  }

  setupContent(path: string) {
    let pageTitle = 'Information | EVCorn';
    let metaDesc = 'Learn more about EVCorn, including our terms, privacy policy, and contact information.';

    switch (path) {
      case 'terms':
        this.title = 'Terms & Conditions';
        pageTitle = 'Terms & Conditions | EVCorn';
        metaDesc = 'Read the terms and conditions for using the EVCorn website.';
        this.content = `
          <p>Welcome to EVCorn. By accessing or using our website, you agree to comply with and be bound by the following terms and conditions:</p>
          <h2>1. Use of Content</h2>
          <p>All specifications, articles, and reviews published on EVCorn are for informational purposes only. While we strive to present accurate vehicle data, we are not responsible for any inaccuracies or decisions made based on this info.</p>
          <h2>2. Intellectual Property</h2>
          <p>All brand logos, SVGs, and trademarked names belong to their respective corporate owners. Editorial content is copyright of EVCorn.</p>
        `;
        break;
      case 'privacy':
        this.title = 'Privacy Policy';
        pageTitle = 'Privacy Policy | EVCorn';
        metaDesc = 'Read our privacy policy to understand how EVCorn handles and protects your data.';
        this.content = `
          <p>Your privacy is important to us. It is EVCorn's policy to respect your privacy regarding any information we may collect from you across our website:</p>
          <h2>1. Data Collection</h2>
          <p>We do not collect any personal identifier details from regular visitors browsing specifications or reading articles. Admin sessions are logged for security purposes only.</p>
          <h2>2. Cookies</h2>
          <p>We use simple local storage configurations to save visitor session preferences (like dark mode styling or compared car states).</p>
        `;
        break;
      case 'faqs':
        this.title = 'Frequently Asked Questions';
        pageTitle = 'Frequently Asked Questions (FAQ) | EVCorn';
        metaDesc = 'Have questions about EVCorn or electric vehicles? Read our frequently asked questions.';
        this.content = `
          <h2>Q1: Is EVCorn affiliated with any EV brands?</h2>
          <p>No. EVCorn is a completely independent public database cataloging EV specs and electric transition insights.</p>
          <h2>Q2: Can I publish my own EV specs?</h2>
          <p>Currently, specs publishing is restricted to the administrator. If you want to contribute listings, please reach out via our contact page.</p>
          <h2>Q3: How are compared metrics compiled?</h2>
          <p>Dimensions, motor output values, and battery sizes are sourced directly from brand official product manuals.</p>
        `;
        break;
      case 'feedback':
        this.title = 'Feedback';
        pageTitle = 'Give Feedback | EVCorn';
        metaDesc = 'Share your feedback, feature requests, and suggestions with the EVCorn team.';
        this.content = `
          <p>We value your suggestions to make EVCorn the best electric vehicle platform online!</p>
          <p>Please share your feedback regarding directory features, compare fields, or visual style layouts. We read and implement suggestions regularly.</p>
          <p>📧 Email us at: <strong>feedback@evcorn.com</strong></p>
        `;
        break;
      case 'contact':
        this.title = 'Contact Us';
        pageTitle = 'Contact Us | EVCorn';
        metaDesc = 'Get in touch with the EVCorn team for business inquiries, collaborations, or general questions.';
        this.content = `
          <p>Get in touch with our team for general queries, collaborations, or content suggestions.</p>
          <h2>Business Enquiries</h2>
          <p>📧 Email: <strong>hello@evcorn.com</strong></p>
          <p>📍 Location: Delhi NCR, India</p>
        `;
        break;
      case 'advertise':
        this.title = 'Advertise with Us';
        pageTitle = 'Advertise | EVCorn';
        metaDesc = 'Partner with EVCorn to display your electric mobility products to a dedicated eco-conscious audience.';
        this.content = `
          <p>Partner with EVCorn to display your electric mobility products, accessories, charging networks, or services to a dedicated eco-conscious audience.</p>
          <h2>Sponsorship Inquiries</h2>
          <p>For custom banners, media kits, or sponsored articles, contact: <strong>ads@evcorn.com</strong></p>
        `;
        break;
      default:
        this.title = 'Information';
        this.content = '<p>Information page content is currently empty.</p>';
    }

    this.seoService.updateSeo({
      title: pageTitle,
      description: metaDesc
    });

    this.schemaService.setSchema([
      this.schemaService.buildBreadcrumbs([
        { name: 'Home', url: '' },
        { name: this.title, url: `/info/${path}` }
      ]),
      this.schemaService.buildWebPage(this.title, metaDesc)
    ]);
  }
}
