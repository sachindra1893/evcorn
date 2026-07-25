import { Injectable, Inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';

export interface SeoConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string; // 'website' | 'article'
  author?: string;
  publishDate?: string;
  noindex?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly defaultTitle = 'EVCorn - Electric Innovation';
  private readonly defaultDesc = 'EVCorn is the premier hub for electric vehicles in India. Compare EVs, calculate solar ROI, and plan charging routes.';
  private readonly defaultImage = 'https://evcorn.com/assets/images/logo.png';
  private readonly defaultUrl = 'https://evcorn.com';
  private readonly twitterHandle = '@EVCorn';
  private readonly siteName = 'EVCorn';

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private router: Router,
    @Inject(DOCUMENT) private dom: Document
  ) {}

  updateSeo(config: SeoConfig) {
    const title = config.title ? `${config.title} | EVCorn` : this.defaultTitle;
    const description = config.description || this.defaultDesc;
    const image = config.image || this.defaultImage;
    const url = config.url || `${this.defaultUrl}${this.router.url}`;
    const type = config.type || 'website';

    // 1. Set Title
    this.titleService.setTitle(title);

    // 2. Standard Meta Description
    this.metaService.updateTag({ name: 'description', content: description });

    // 3. Open Graph (Facebook/LinkedIn/Others)
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:image', content: image });
    this.metaService.updateTag({ property: 'og:url', content: url });
    this.metaService.updateTag({ property: 'og:type', content: type });
    this.metaService.updateTag({ property: 'og:site_name', content: this.siteName });

    // 4. Twitter Cards
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:site', content: this.twitterHandle });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: image });

    // 5. Article specifics (if applicable)
    if (type === 'article') {
      if (config.author) {
        this.metaService.updateTag({ property: 'article:author', content: config.author });
      }
      if (config.publishDate) {
        this.metaService.updateTag({ property: 'article:published_time', content: config.publishDate });
      }
    } else {
      this.metaService.removeTag("property='article:author'");
      this.metaService.removeTag("property='article:published_time'");
    }

    // 6. Canonical URL
    this.updateCanonicalUrl(url);

    // 7. Robots (noindex)
    if (config.noindex) {
      this.metaService.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    } else {
      this.metaService.removeTag("name='robots'");
    }
  }

  private updateCanonicalUrl(url: string) {
    const head = this.dom.getElementsByTagName('head')[0];
    let element: HTMLLinkElement | null = this.dom.querySelector(`link[rel='canonical']`);
    
    if (!element) {
      element = this.dom.createElement('link') as HTMLLinkElement;
      element.setAttribute('rel', 'canonical');
      head.appendChild(element);
    }
    
    // Clean up query parameters for canonical if they are not essential,
    // though in some cases like /compare?model=X we MIGHT want them.
    // For now, EVCorn relies heavily on canonical base URLs.
    element.setAttribute('href', url.split('?')[0]);
  }
}
