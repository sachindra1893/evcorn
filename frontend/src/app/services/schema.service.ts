import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class SchemaService {
  private readonly siteUrl = 'https://evcorn.com';
  private readonly logoUrl = 'https://evcorn.com/assets/images/logo.png';
  private readonly siteName = 'EVCorn';

  constructor(
    @Inject(DOCUMENT) private dom: Document,
    private router: Router
  ) {}

  /**
   * Main entry point to inject schemas.
   * Clears old JSON-LD scripts and appends new ones.
   */
  setSchema(schemaList: any[]) {
    // 1. Clear old schema tags (only dynamic ones)
    const oldScripts = this.dom.querySelectorAll('script[data-dynamic="true"]');
    oldScripts.forEach(script => script.remove());

    // 2. Append new schema tags
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

  buildOrganization() {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': this.siteName,
      'url': this.siteUrl,
      'logo': this.logoUrl,
      'description': 'EVCorn is the premier hub for electric vehicles in India. Compare EVs, calculate solar ROI, and plan charging routes.',
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

  buildWebPage(name: string, description: string) {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': name,
      'description': description,
      'url': `${this.siteUrl}${this.router.url.split('?')[0]}`
    };
  }

  buildCollectionPage(name: string, description: string) {
    return {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': name,
      'description': description,
      'url': `${this.siteUrl}${this.router.url.split('?')[0]}`
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
      'item': `${this.siteUrl}${item.url}`
    }));

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': itemListElement
    };
  }

  buildArticle(article: {
    headline: string,
    description?: string,
    image?: string,
    datePublished?: string,
    dateModified?: string
  }) {
    const imageUrl = article.image 
      ? (article.image.startsWith('http') ? article.image : `${this.siteUrl}${article.image}`)
      : this.logoUrl;

    return {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': `${this.siteUrl}${this.router.url}`
      },
      'headline': article.headline,
      'description': article.description,
      'image': imageUrl,
      'author': {
        '@type': 'Organization',
        'name': this.siteName
      },
      'publisher': {
        '@type': 'Organization',
        'name': this.siteName,
        'logo': {
          '@type': 'ImageObject',
          'url': this.logoUrl
        }
      },
      'datePublished': article.datePublished || new Date().toISOString(),
      'dateModified': article.dateModified || new Date().toISOString()
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
    chargingTime?: string
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
    };

    if (product.image) {
      schema['image'] = product.image.startsWith('http') ? product.image : `${this.siteUrl}${product.image}`;
    }

    if (product.price) {
      // Basic extraction of price numeric value for Offers
      // Convert something like "₹14.49 Lakh" or "₹14,49,000" to valid price
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
          'url': `${this.siteUrl}${this.router.url}`
        };
      }
    }

    // Additional Properties
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
