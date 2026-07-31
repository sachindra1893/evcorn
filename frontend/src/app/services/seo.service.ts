import { Injectable, Inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import {
  SITE_DEFAULT_DESCRIPTION,
  SITE_DEFAULT_IMAGE,
  SITE_DEFAULT_TITLE,
  SITE_LOCALE,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_TWITTER_HANDLE
} from './seo.constants';
import { formatMetaDescription, formatSeoTitle, toAbsoluteUrl, toCanonicalUrl } from './seo.utils';

export interface SeoConfig {
  title: string;
  description: string;
  image?: string;
  /** Absolute or site-relative URL. Query kept only when keepQuery is true. */
  url?: string;
  type?: string; // 'website' | 'article' | 'product'
  author?: string;
  publishDate?: string;
  modifiedDate?: string;
  noindex?: boolean;
  imageAlt?: string;
  /** Preserve query string on canonical + og:url (e.g. compare selections). */
  keepQuery?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly defaultTitle = SITE_DEFAULT_TITLE;
  private readonly defaultDesc = SITE_DEFAULT_DESCRIPTION;
  private readonly defaultImage = SITE_DEFAULT_IMAGE;
  private readonly defaultUrl = SITE_ORIGIN;
  private readonly twitterHandle = SITE_TWITTER_HANDLE;
  private readonly siteName = SITE_NAME;

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private router: Router,
    @Inject(DOCUMENT) private dom: Document
  ) {}

  updateSeo(config: SeoConfig) {
    const title = config.title
      ? formatSeoTitle(config.title, this.siteName)
      : this.defaultTitle;
    const description = formatMetaDescription(config.description, this.defaultDesc) || this.defaultDesc;
    const image = config.image
      ? toAbsoluteUrl(config.image)
      : this.defaultImage;
    const imageAlt = (config.imageAlt || title).trim();
    const pathFallback = this.router.url || '/';
    const url = toCanonicalUrl(config.url || `${this.defaultUrl}${pathFallback}`, {
      keepQuery: !!config.keepQuery
    });
    const type = config.type || 'website';

    this.titleService.setTitle(title);

    this.metaService.updateTag({ name: 'description', content: description });

    // Indexability: explicit public robots; noindex for private/error shells.
    if (config.noindex) {
      this.metaService.updateTag({ name: 'robots', content: 'noindex, nofollow' });
      this.metaService.updateTag({ name: 'googlebot', content: 'noindex, nofollow' });
    } else {
      this.metaService.updateTag({
        name: 'robots',
        content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
      });
      this.metaService.removeTag("name='googlebot'");
    }

    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:image', content: image });
    this.metaService.updateTag({ property: 'og:image:alt', content: imageAlt });
    this.metaService.updateTag({ property: 'og:url', content: url });
    this.metaService.updateTag({ property: 'og:type', content: type === 'product' ? 'website' : type });
    this.metaService.updateTag({ property: 'og:site_name', content: this.siteName });
    this.metaService.updateTag({ property: 'og:locale', content: SITE_LOCALE });

    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:site', content: this.twitterHandle });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: image });
    this.metaService.updateTag({ name: 'twitter:image:alt', content: imageAlt });

    if (type === 'article') {
      if (config.author) {
        this.metaService.updateTag({ property: 'article:author', content: config.author });
      }
      if (config.publishDate) {
        this.metaService.updateTag({ property: 'article:published_time', content: config.publishDate });
      }
      if (config.modifiedDate) {
        this.metaService.updateTag({ property: 'article:modified_time', content: config.modifiedDate });
      }
    } else {
      this.metaService.removeTag("property='article:author'");
      this.metaService.removeTag("property='article:published_time'");
      this.metaService.removeTag("property='article:modified_time'");
    }

    this.updateCanonicalUrl(url);
    this.updatePaginationLinks(null, null);
  }

  /**
   * Optional rel=prev / rel=next for paginated indexable lists.
   * Pass nulls to clear. Safe no-op when unused (current FE has no page= lists).
   */
  updatePaginationLinks(prevUrl: string | null, nextUrl: string | null) {
    this.setOrRemoveLink('prev', prevUrl ? toCanonicalUrl(prevUrl) : null);
    this.setOrRemoveLink('next', nextUrl ? toCanonicalUrl(nextUrl) : null);
  }

  private updateCanonicalUrl(url: string) {
    const head = this.dom.getElementsByTagName('head')[0];
    let element: HTMLLinkElement | null = this.dom.querySelector(`link[rel='canonical']`);

    if (!element) {
      element = this.dom.createElement('link') as HTMLLinkElement;
      element.setAttribute('rel', 'canonical');
      head.appendChild(element);
    }

    element.setAttribute('href', url);
  }

  private setOrRemoveLink(rel: 'prev' | 'next', href: string | null) {
    const head = this.dom.getElementsByTagName('head')[0];
    let element: HTMLLinkElement | null = this.dom.querySelector(`link[rel='${rel}']`);
    if (!href) {
      element?.remove();
      return;
    }
    if (!element) {
      element = this.dom.createElement('link') as HTMLLinkElement;
      element.setAttribute('rel', rel);
      head.appendChild(element);
    }
    element.setAttribute('href', href);
  }
}
