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

/** Thing ref accepted by enhanced Vehicle / Article builders (from entity-schema-bridge). */
export interface SchemaThingRef {
  path: string;
  name?: string;
  types: string[];
}

export interface SchemaBrandOptions {
  name: string;
  /** Relative brand browse path (`/evs?category=…`) for @id / url. */
  path?: string;
  logoUrl?: string;
  /** Persisted Category id — real CMS data only. */
  identifier?: string;
}

export interface SchemaAuthorPersonOptions {
  name: string;
  jobTitle?: string;
  description?: string;
  imageUrl?: string;
  sameAs?: string[];
}

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
    return this.absoluteId(raw);
  }

  /** Absolute @id / item URL; keeps intentional query (brand browse, compare). */
  private absoluteId(pathOrUrl?: string): string {
    const raw = (pathOrUrl || '/').trim() || '/';
    return toCanonicalUrl(raw, { keepQuery: raw.includes('?') });
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
      'item': this.absoluteId(item.url || '/')
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

  /**
   * Brand node from real CMS Category data only.
   * No invented sameAs / country / address fields.
   */
  buildBrand(brand: SchemaBrandOptions) {
    const name = (brand.name || '').trim();
    const path = (brand.path || '').trim();
    const idUrl = path ? this.absoluteId(path) : undefined;

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Brand',
      'name': name || this.siteName
    };
    if (idUrl) {
      schema['@id'] = idUrl;
      schema['url'] = idUrl;
    }
    const identifier = (brand.identifier || '').trim();
    if (identifier) {
      schema['identifier'] = identifier;
    }
    const logoUrl = (brand.logoUrl || '').trim();
    if (logoUrl && logoUrl !== 'N/A') {
      schema['logo'] = this.buildImageObject(
        logoUrl,
        `${name || 'Brand'} logo`,
        undefined,
        undefined,
        { standalone: false }
      );
    }
    return schema;
  }

  private mapThingRefs(refs: SchemaThingRef[] | undefined): Record<string, unknown>[] | undefined {
    if (!refs?.length) return undefined;
    const out: Record<string, unknown>[] = [];
    const seen = new Set<string>();
    for (const ref of refs) {
      const path = (ref.path || '').trim();
      if (!path || seen.has(path)) continue;
      seen.add(path);
      const types = (ref.types || []).filter(Boolean);
      const node: Record<string, unknown> = {
        '@type': types.length === 1 ? types[0] : types.length > 1 ? types : 'Thing',
        '@id': this.absoluteId(path)
      };
      const name = (ref.name || '').trim();
      if (name) node['name'] = name;
      out.push(node);
    }
    return out.length ? out : undefined;
  }

  private buildAuthorNode(
    author?: string | SchemaAuthorPersonOptions
  ): Record<string, unknown> {
    if (author && typeof author === 'object' && author.name?.trim()) {
      const person: Record<string, unknown> = {
        '@type': 'Person',
        'name': author.name.trim()
      };
      if (author.jobTitle?.trim()) person['jobTitle'] = author.jobTitle.trim();
      if (author.description?.trim()) person['description'] = author.description.trim();
      if (author.imageUrl?.trim()) {
        person['image'] = this.buildImageObject(
          author.imageUrl,
          author.name.trim(),
          undefined,
          undefined,
          { standalone: false }
        );
      }
      const sameAs = (author.sameAs || [])
        .map((u) => (u || '').trim())
        .filter((u) => /^https?:\/\//i.test(u));
      if (sameAs.length) person['sameAs'] = sameAs;
      return person;
    }

    const name =
      typeof author === 'string' && author.trim()
        ? author.trim()
        : this.siteName;
    return {
      '@type': 'Organization',
      'name': name
    };
  }

  buildArticle(article: {
    headline: string,
    description?: string,
    image?: string,
    datePublished?: string,
    dateModified?: string,
    author?: string | SchemaAuthorPersonOptions,
    path?: string,
    /** Absolute or relative @id override (entity graph). */
    id?: string,
    about?: SchemaThingRef[],
    mentions?: SchemaThingRef[]
  }): Record<string, unknown> {
    const imageUrl = article.image
      ? toAbsoluteUrl(article.image)
      : this.logoUrl;
    const pageUrl = this.currentPageUrl(article.path);
    const idUrl = article.id?.trim()
      ? this.absoluteId(article.id)
      : pageUrl;

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': idUrl,
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': pageUrl
      },
      'headline': article.headline,
      'description': article.description,
      'image': this.buildImageObject(imageUrl, article.headline, 1200, 630, { standalone: false }),
      'author': this.buildAuthorNode(article.author),
      'publisher': {
        '@type': 'Organization',
        'name': this.siteName,
        'logo': this.buildImageObject(this.logoUrl, `${this.siteName} logo`, undefined, undefined, { standalone: false })
      },
      'datePublished': article.datePublished || new Date().toISOString(),
      'dateModified': article.dateModified || article.datePublished || new Date().toISOString()
    };

    const about = this.mapThingRefs(article.about);
    if (about) schema['about'] = about;
    const mentions = this.mapThingRefs(article.mentions);
    if (mentions) schema['mentions'] = mentions;

    return schema;
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
    path?: string,
    id?: string,
    brandPath?: string,
    brandLogoUrl?: string,
    brandIdentifier?: string,
    about?: SchemaThingRef[],
    isRelatedTo?: SchemaThingRef[]
  }): Record<string, unknown> {
    const pageUrl = this.currentPageUrl(product.path);
    const idUrl = product.id?.trim()
      ? this.absoluteId(product.id)
      : pageUrl;

    const brandNode: Record<string, unknown> = {
      '@type': 'Brand',
      'name': product.brand
    };
    if (product.brandPath?.trim()) {
      const brandId = this.absoluteId(product.brandPath);
      brandNode['@id'] = brandId;
      brandNode['url'] = brandId;
    }
    if (product.brandIdentifier?.trim()) {
      brandNode['identifier'] = product.brandIdentifier.trim();
    }
    if (product.brandLogoUrl?.trim()) {
      brandNode['logo'] = this.buildImageObject(
        product.brandLogoUrl,
        `${product.brand} logo`,
        undefined,
        undefined,
        { standalone: false }
      );
    }

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': idUrl,
      'name': product.name,
      'brand': brandNode,
      'category': 'Vehicle > Electric Vehicle',
      'description': product.description || `Explore specifications and pricing for the ${product.name}.`,
      'url': pageUrl
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
          'url': pageUrl
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

    const about = this.mapThingRefs(product.about);
    if (about) schema['about'] = about;
    const isRelatedTo = this.mapThingRefs(product.isRelatedTo);
    if (isRelatedTo) schema['isRelatedTo'] = isRelatedTo;

    return schema;
  }

  /**
   * Vehicle-appropriate schema: Product + Car additional type for EV model pages.
   * Scalable for thousands of model pages without hardcoding.
   * Entity-graph enhancements (@id, brand ref, about, isRelatedTo) are additive.
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
    bodyStyle?: string,
    id?: string,
    brandPath?: string,
    brandLogoUrl?: string,
    brandIdentifier?: string,
    about?: SchemaThingRef[],
    isRelatedTo?: SchemaThingRef[]
  }): Record<string, unknown> {
    const product = this.buildProduct(vehicle);
    // Single Product+Car node — never emit a second Product/Car duplicate.
    const schema: Record<string, unknown> = {
      ...product,
      '@type': ['Product', 'Car'],
      'vehicleConfiguration': 'Electric Vehicle',
      'fuelType': 'Electric'
    };
    if (vehicle.bodyStyle) schema['bodyType'] = vehicle.bodyStyle;
    if (vehicle.range) {
      schema['mileageFromOdometer'] = {
        '@type': 'QuantitativeValue',
        'value': vehicle.range,
        'unitCode': 'KMT'
      };
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
