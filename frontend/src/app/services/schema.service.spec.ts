import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SchemaService } from './schema.service';

describe('SchemaService — Phase 7.3 M3 graph linking', () => {
  let schema: SchemaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), SchemaService]
    });
    schema = TestBed.inject(SchemaService);
  });

  it('buildBrand uses CMS name/logo/url/identifier only (no invented sameAs)', () => {
    const brand = schema.buildBrand({
      name: 'Tata Motors',
      path: '/evs?category=tata-motors',
      logoUrl: 'https://cdn.example/tata.png',
      identifier: 'tata'
    });
    expect(brand['@type']).toBe('Brand');
    expect(brand['@id']).toBe('https://evcorn.com/evs?category=tata-motors');
    expect(brand['url']).toBe('https://evcorn.com/evs?category=tata-motors');
    expect(brand['name']).toBe('Tata Motors');
    expect(brand['identifier']).toBe('tata');
    expect(brand['logo']).toBeTruthy();
    expect(brand['sameAs']).toBeUndefined();
    expect(brand['address']).toBeUndefined();
    expect(brand['country']).toBeUndefined();
  });

  it('buildVehicle adds @id, brand ref, about, isRelatedTo without duplicating Product', () => {
    const vehicle = schema.buildVehicle({
      name: 'Tata Motors Nexon EV',
      brand: 'Tata Motors',
      path: '/ev/tata-motors/nexon-ev',
      id: '/ev/tata-motors/nexon-ev',
      brandPath: '/evs?category=tata-motors',
      brandIdentifier: 'tata',
      about: [
        {
          path: '/evs?category=tata-motors',
          name: 'Tata Motors',
          types: ['Brand']
        }
      ],
      isRelatedTo: [
        {
          path: '/ev/tata-motors/punch-ev',
          name: 'Punch EV',
          types: ['Product', 'Car']
        },
        {
          path: '/articles/art-1',
          name: 'Guide',
          types: ['Article']
        }
      ]
    });

    expect(vehicle['@type']).toEqual(['Product', 'Car']);
    expect(vehicle['@id']).toBe('https://evcorn.com/ev/tata-motors/nexon-ev');
    const brand = vehicle['brand'] as Record<string, unknown>;
    expect(brand['@id']).toBe('https://evcorn.com/evs?category=tata-motors');
    const about = vehicle['about'] as Record<string, unknown>[];
    expect(about[0]['@type']).toBe('Brand');
    const related = vehicle['isRelatedTo'] as Record<string, unknown>[];
    expect(related.length).toBe(2);
    expect(related[0]['@type']).toEqual(['Product', 'Car']);
  });

  it('buildVehicle without graph extras still emits Phase 7.1 Product+Car', () => {
    const vehicle = schema.buildVehicle({
      name: 'Tata Motors Nexon EV',
      brand: 'Tata Motors',
      path: '/ev/tata-motors/nexon-ev',
      range: '300 km'
    });
    expect(vehicle['@type']).toEqual(['Product', 'Car']);
    expect(vehicle['fuelType']).toBe('Electric');
    expect(vehicle['about']).toBeUndefined();
    expect(vehicle['isRelatedTo']).toBeUndefined();
    expect((vehicle['brand'] as Record<string, unknown>)['name']).toBe('Tata Motors');
  });

  it('buildArticle supports @id, about, mentions, Person author when valid', () => {
    const article = schema.buildArticle({
      headline: 'Nexon vs Punch',
      description: 'Compare',
      path: '/articles/art-1',
      id: '/articles/art-1',
      author: {
        name: 'Alex',
        jobTitle: 'Editor',
        sameAs: ['https://twitter.com/alex']
      },
      about: [
        {
          path: '/ev/tata-motors/nexon-ev',
          name: 'Nexon EV',
          types: ['Product', 'Car']
        }
      ],
      mentions: [
        { path: '/articles/art-2', name: 'Related', types: ['Article'] }
      ]
    });

    expect(article['@id']).toBe('https://evcorn.com/articles/art-1');
    const author = article['author'] as Record<string, unknown>;
    expect(author['@type']).toBe('Person');
    expect(author['jobTitle']).toBe('Editor');
    expect(author['sameAs']).toEqual(['https://twitter.com/alex']);
    expect((article['about'] as unknown[]).length).toBe(1);
    expect((article['mentions'] as unknown[]).length).toBe(1);
  });

  it('buildArticle falls back to Organization author for bare string', () => {
    const article = schema.buildArticle({
      headline: 'News',
      path: '/articles/x',
      author: 'EVCorn Editorial'
    });
    const author = article['author'] as Record<string, unknown>;
    expect(author['@type']).toBe('Organization');
    expect(author['name']).toBe('EVCorn Editorial');
    expect(article['about']).toBeUndefined();
    expect(article['mentions']).toBeUndefined();
  });

  it('buildBreadcrumbs keep brand category query via entity-href paths', () => {
    const crumbs = schema.buildBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Browse EVs', url: '/evs' },
      { name: 'Tata Motors', url: '/evs?category=tata-motors' },
      { name: 'Nexon EV', url: '/ev/tata-motors/nexon-ev' }
    ]);
    const items = crumbs['itemListElement'] as Array<Record<string, unknown>>;
    expect(items[2]['item']).toBe('https://evcorn.com/evs?category=tata-motors');
    expect(items[3]['item']).toBe('https://evcorn.com/ev/tata-motors/nexon-ev');
  });

  it('omits empty about / isRelatedTo when empty arrays passed', () => {
    const vehicle = schema.buildVehicle({
      name: 'X',
      brand: 'Y',
      path: '/ev/y/x',
      about: [],
      isRelatedTo: []
    });
    expect(vehicle['about']).toBeUndefined();
    expect(vehicle['isRelatedTo']).toBeUndefined();
  });
});
