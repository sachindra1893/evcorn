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

  private readonly faqItems = [
    {
      question: 'Is EVCorn affiliated with any EV brands?',
      answer:
        'No. EVCorn is a completely independent public database cataloging EV specs and electric transition insights.'
    },
    {
      question: 'Can I publish my own EV specs?',
      answer:
        'Currently, specs publishing is restricted to the administrator. If you want to contribute listings, please reach out via our contact page.'
    },
    {
      question: 'How are compared metrics compiled?',
      answer:
        'Dimensions, motor output values, and battery sizes are sourced directly from brand official product manuals.'
    }
  ];

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
    let pageTitle = 'Information';
    let metaDesc =
      'Learn more about EVCorn, including terms of use, privacy policy, FAQs, and how to contact the team about electric vehicles in India.';
    let faqs: { question: string; answer: string }[] | null = null;

    switch (path) {
      case 'terms':
        this.title = 'Terms & Conditions';
        pageTitle = 'Terms & Conditions';
        metaDesc =
          'Read the terms and conditions for using EVCorn. Learn how EV specs, articles, and reviews may be used and what intellectual property rules apply.';
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
        pageTitle = 'Privacy Policy';
        metaDesc =
          'Read the EVCorn privacy policy to understand what data we collect, how cookies and local storage are used, and how we protect visitor information.';
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
        pageTitle = 'Frequently Asked Questions (FAQ)';
        metaDesc =
          'Have questions about EVCorn or electric vehicles in India? Read FAQs on brand affiliation, contributing specs, and how comparison metrics are compiled.';
        this.content = this.faqItems
          .map(
            (item, i) =>
              `<h2>Q${i + 1}: ${item.question}</h2><p>${item.answer}</p>`
          )
          .join('');
        faqs = this.faqItems;
        break;
      case 'feedback':
        this.title = 'Feedback';
        pageTitle = 'Give Feedback';
        metaDesc =
          'Share feedback, feature requests, and suggestions with the EVCorn team to improve EV comparison tools, directory features, and reviews.';
        this.content = `
          <p>We value your suggestions to make EVCorn the best electric vehicle platform online!</p>
          <p>Please share your feedback regarding directory features, compare fields, or visual style layouts. We read and implement suggestions regularly.</p>
          <p>📧 Email us at: <strong>feedback@evcorn.com</strong></p>
        `;
        break;
      case 'contact':
        this.title = 'Contact Us';
        pageTitle = 'Contact Us';
        metaDesc =
          'Get in touch with the EVCorn team for business inquiries, collaborations, content suggestions, or general questions about electric vehicles in India.';
        this.content = `
          <p>Get in touch with our team for general queries, collaborations, or content suggestions.</p>
          <h2>Business Enquiries</h2>
          <p>📧 Email: <strong>hello@evcorn.com</strong></p>
          <p>📍 Location: Delhi NCR, India</p>
        `;
        break;
      case 'advertise':
        this.title = 'Advertise with Us';
        pageTitle = 'Advertise';
        metaDesc =
          'Partner with EVCorn to advertise electric mobility products, charging networks, and services to an eco-conscious EV audience in India.';
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

    const routePath = `/${path || 'info'}`;

    this.seoService.updateSeo({
      title: pageTitle,
      description: metaDesc,
      url: routePath
    });

    const schemas: any[] = [
      this.schemaService.buildBreadcrumbs([
        { name: 'Home', url: '/' },
        { name: this.title, url: routePath }
      ]),
      this.schemaService.buildWebPage(this.title, metaDesc, routePath)
    ];

    if (faqs) {
      schemas.push(this.schemaService.buildFAQ(faqs));
    }

    this.schemaService.setSchema(schemas);
  }
}
