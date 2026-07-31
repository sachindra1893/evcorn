import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import {
  SITE_DEFAULT_DESCRIPTION,
  SITE_DEFAULT_IMAGE,
  SITE_NAME,
  SITE_ORIGIN
} from './seo.constants';
import { toAbsoluteUrl, toCanonicalUrl } from './seo.utils';

@Injectable({
  providedIn: 'root'
})
export class SchemaService {
  private readonly siteUrl = SITE_ORIGIN;
  private readonly logoUrl = SITE_DEFAULT_IMAGE;
  private readonly siteName = SITE_NAME;

  constructor(
    @Inject(DOCUMENT) private dom: Document,
    private router: Router
  ) {}

  /**
   * Clears old dynamic JSON-LD scripts and appends new ones.
   */
  setSchema(schemaList: any[]) {
    const oldScripts = this.dom.querySelectorAll('script[data-dynamic="true"]');
    oldScripts.forEach(script => script.remove());

    if (schemaList && schemaList.length > 0) {
      schemaList.forEach(schema => {
        const script = this.dom.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-dynamic', 'true');
        script.text = JSON.stringify(schema);
        this.dom.head.appendChild(script);
      });
    }
  }

  currentPageUrl(path?: string): string {
    const raw = path ?? this.router.url.split('?')[0];
    return toCanonicalUrl(raw);
  }

  buildOrganization() {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': this.siteName,
      'url': this.siteUrl,
      'logo': this.buildImageObject(this.logoUrl, `${this.siteName} logo`, undefined, undefined, { standalone: false }),
      'description': SITE_DEFAULT_DESCRIPTION,
      'sameAs': [
        'https://twitter.com/EVCorn',
        'https://linkedin.com/company/evcorn'
      ]
    };
  }

  buildWebSite() {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': this.siteName,
      'url': this.siteUrl,
      'publisher': {
        '@type': 'Organization',
        'name': this.siteName
      },
      'potentialAction': {
        '@type': 'SearchAction',
        'target': {
          '@type': 'EntryPoint',
          'urlTemplate': `${this.siteUrl}/search?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    };
  }

  buildWebPage(name: string, description: string, path?: string) {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': name,
      'description': description,
      'url': this.currentPageUrl(path),
      'isPartOf': {
        '@type': 'WebSite',
        'name': this.siteName,
        'url': this.siteUrl
      }
    };
  }

  buildCollectionPage(name: string, description: string, path?: string) {
    return {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': name,
      'description': description,
      'url': this.currentPageUrl(path)
    };
  }

  buildSearchResultsPage(query: string) {
    return {
      '@context': 'https://schema.org',
      '@type': 'SearchResultsPage',
      'name': `Search results for "${query}"`,
      'url': `${this.siteUrl}/search?q=${encodeURIComponent(query)}`
    };
  }

  buildBreadcrumbs(items: { name: string; url: string }[]) {
    const itemListElement = items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': toCanonicalUrl(item.url || '/')
    }));

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': itemListElement
    };
  }

  buildImageObject(
    imageUrl: string,
    caption?: string,
    width?: number,
    height?: number,
    options: { standalone?: boolean } = { standalone: true }
  ) {
    const url = toAbsoluteUrl(imageUrl || this.logoUrl);
    const schema: Record<string, unknown> = {
      '@type': 'ImageObject',
      'url': url,
      'contentUrl': url
    };
    if (options.standalone !== false) {
      schema['@context'] = 'https://schema.org';
    }
    if (caption) {
      schema['caption'] = caption;
      schema['name'] = caption;
    }
    if (width) schema['width'] = width;
    if (height) schema['height'] = height;
    return schema;
  }

  buildArticle(article: {
    headline: string,
    description?: string,
    image?: string,
    datePublished?: string,
    dateModified?: string,
    author?: string,
    path?: string
  }) {
    const imageUrl = article.image
      ? toAbsoluteUrl(article.image)
      : this.logoUrl;
    const pageUrl = this.currentPageUrl(article.path);

    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': pageUrl
      },
      'headline': article.headline,
      'description': article.description,
      'image': this.buildImageObject(imageUrl, article.headline, 1200, 630, { standalone: false }),
      'author': {
        '@type': 'Organization',
        'name': article.author || this.siteName
      },
      'publisher': {
        '@type': 'Organization',
        'name': this.siteName,
        'logo': this.buildImageObject(this.logoUrl, `${this.siteName} logo`, undefined, undefined, { standalone: false })
      },
      'datePublished': article.datePublished || new Date().toISOString(),
      'dateModified': article.dateModified || article.datePublished || new Date().toISOString()
    };
  }

  buildProduct(product: {
    name: string,
    brand: string,
    description?: string,
    image?: string,
    price?: string,
    batteryCapacity?: string,
    range?: string,
    chargingTime?: string,
    path?: string
  }) {
    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': product.name,
      'brand': {
        '@type': 'Brand',
        'name': product.brand
      },
      'category': 'Vehicle > Electric Vehicle',
      'description': product.description || `Explore specifications and pricing for the ${product.name}.`,
      'url': this.currentPageUrl(product.path)
    };

    if (product.image) {
      schema['image'] = this.buildImageObject(
        product.image,
        product.name,
        1200,
        675,
        { standalone: false }
      );
    }

    if (product.price) {
      let cleanPrice = product.price.replace(/[^0-9.]/g, '');
      if (product.price.toLowerCase().includes('lakh')) {
        cleanPrice = (parseFloat(cleanPrice) * 100000).toString();
      }

      if (cleanPrice && !isNaN(parseFloat(cleanPrice))) {
        schema['offers'] = {
          '@type': 'Offer',
          'priceCurrency': 'INR',
          'price': cleanPrice,
          'availability': 'https://schema.org/InStock',
          'url': this.currentPageUrl(product.path)
        };
      }
    }

    const additionalProperties = [];
    if (product.batteryCapacity) {
      additionalProperties.push({
        '@type': 'PropertyValue',
        'name': 'Battery Capacity',
        'value': product.batteryCapacity
      });
    }
    if (product.range) {
      additionalProperties.push({
        '@type': 'PropertyValue',
        'name': 'Range',
        'value': product.range
      });
    }
    if (product.chargingTime) {
      additionalProperties.push({
        '@type': 'PropertyValue',
        'name': 'Charging Time',
        'value': product.chargingTime
      });
    }

    if (additionalProperties.length > 0) {
      schema['additionalProperty'] = additionalProperties;
    }

    return schema;
  }

  /**
   * Vehicle-appropriate schema: Product + Car additional type for EV model pages.
   * Scalable for thousands of model pages without hardcoding.
   */
  buildVehicle(vehicle: {
    name: string,
    brand: string,
    description?: string,
    image?: string,
    price?: string,
    batteryCapacity?: string,
    range?: string,
    chargingTime?: string,
    path?: string,
    bodyStyle?: string
  }) {
    const product = this.buildProduct(vehicle);
    return {
      ...product,
      '@type': ['Product', 'Car'],
      'vehicleConfiguration': 'Electric Vehicle',
      'fuelType': 'Electric',
      ...(vehicle.bodyStyle ? { bodyType: vehicle.bodyStyle } : {}),
      ...(vehicle.range ? {
        mileageFromOdometer: {
          '@type': 'QuantitativeValue',
          'value': vehicle.range,
          'unitCode': 'KMT'
        }
      } : {})
    };
  }

  buildFAQ(faqs: { question: string, answer: string }[]) {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': faqs.map(faq => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer
        }
      }))
    };
  }
}
