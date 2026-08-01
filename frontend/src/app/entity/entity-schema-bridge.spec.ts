import {
  articleSchemaFromGraph,
  authorPersonFromCms,
  safeArticleSchemaFromGraph,
  safeVehicleSchemaFromGraph,
  vehicleSchemaFromGraph
} from './entity-schema-bridge';
import { buildArticlePageGraph, buildVehiclePageGraph } from './entity-graph';

describe('entity-schema-bridge — vehicle', () => {
  const brand = { id: 'tata', name: 'Tata Motors', logoUrl: 'https://cdn.example/tata.png' };
  const variants = [
    {
      id: 'v1',
      categoryId: 'tata',
      brandName: 'Tata Motors',
      parentModel: 'Nexon EV',
      variantName: 'MR',
      bodyStyle: 'SUV'
    }
  ];

  it('emits brand + model path @id inputs from graph', () => {
    const graph = buildVehiclePageGraph({
      brand,
      variants,
      selectedVariant: variants[0]
    });
    const input = vehicleSchemaFromGraph(graph);
    expect(input?.path).toBe('/ev/tata-motors/nexon-ev');
    expect(input?.brand).toEqual({
      name: 'Tata Motors',
      path: '/evs?category=tata-motors',
      logoUrl: 'https://cdn.example/tata.png',
      identifier: 'tata'
    });
    expect(input?.about?.some((a) => a.types.includes('Brand'))).toBe(true);
  });

  it('caps related vehicles ≤6 and articles ≤4; omits empty isRelatedTo', () => {
    const recommendedVehicles = Array.from({ length: 8 }, (_, i) => ({
      id: `r${i}`,
      brandName: 'MG',
      parentModel: `Model ${i}`,
      categoryId: 'mg'
    }));
    const recommendedArticles = Array.from({ length: 6 }, (_, i) => ({
      id: `a${i}`,
      title: `Article ${i}`
    }));

    const withRelated = vehicleSchemaFromGraph(
      buildVehiclePageGraph({
        brand,
        variants,
        selectedVariant: variants[0],
        recommendedVehicles,
        recommendedArticles
      })
    );
    const vehicleRefs = (withRelated?.isRelatedTo || []).filter((r) =>
      r.types.includes('Product')
    );
    const articleRefs = (withRelated?.isRelatedTo || []).filter((r) =>
      r.types.includes('Article')
    );
    expect(vehicleRefs.length).toBe(6);
    expect(articleRefs.length).toBe(4);

    const bare = vehicleSchemaFromGraph(
      buildVehiclePageGraph({ brand, variants, selectedVariant: variants[0] })
    );
    expect(bare?.isRelatedTo).toBeUndefined();
  });

  it('does not invent sameAs / country on brand input', () => {
    const input = vehicleSchemaFromGraph(
      buildVehiclePageGraph({ brand, variants, selectedVariant: variants[0] })
    );
    expect(input?.brand).toBeTruthy();
    expect((input?.brand as any).sameAs).toBeUndefined();
    expect((input?.brand as any).country).toBeUndefined();
    expect((input?.brand as any).address).toBeUndefined();
  });

  it('safe wrapper returns null on throw / empty graph', () => {
    expect(safeVehicleSchemaFromGraph(null)).toBeNull();
    expect(safeVehicleSchemaFromGraph({ nodes: [], edges: [] })).toBeNull();
  });
});

describe('entity-schema-bridge — article', () => {
  const article = {
    id: 'art-1',
    title: 'Nexon vs Punch',
    author: {
      name: 'Alex Writer',
      role: 'Editor',
      bio: 'Covers EVs in India',
      socialLinks: { twitter: 'https://twitter.com/alex', linkedin: '' }
    },
    relationships: {
      relatedBrandIds: ['tata'],
      relatedVehicleIds: ['v1'],
      relatedArticleIds: ['art-2', 'art-3']
    },
    blocks: []
  };

  it('emits about (brand/vehicle) and mentions (articles) with caps', () => {
    const graph = buildArticlePageGraph({
      article,
      brands: [{ id: 'tata', name: 'Tata Motors' }],
      editorialVehicles: [
        {
          id: 'v1',
          brandName: 'Tata Motors',
          parentModel: 'Nexon EV',
          categoryId: 'tata'
        }
      ],
      editorialArticles: [
        { id: 'art-2', title: 'Related 2' },
        { id: 'art-3', title: 'Related 3' }
      ]
    });

    const input = articleSchemaFromGraph(graph, { author: article.author });
    expect(input?.path).toBe('/articles/art-1');
    expect(input?.about?.some((a) => a.types.includes('Brand'))).toBe(true);
    expect(input?.about?.some((a) => a.types.includes('Product'))).toBe(true);
    expect(input?.mentions?.length).toBe(2);
    expect(input?.mentions?.every((m) => m.types.includes('Article'))).toBe(true);
    expect(input?.authorPerson?.name).toBe('Alex Writer');
    expect(input?.authorPerson?.jobTitle).toBe('Editor');
    expect(input?.authorPerson?.sameAs).toEqual(['https://twitter.com/alex']);
  });

  it('omits empty about/mentions arrays', () => {
    const graph = buildArticlePageGraph({
      article: { id: 'solo', title: 'Solo piece', relationships: {} }
    });
    const input = articleSchemaFromGraph(graph);
    expect(input?.about).toBeUndefined();
    expect(input?.mentions).toBeUndefined();
    expect(input?.path).toBe('/articles/solo');
  });

  it('caps related articles mentions at 4', () => {
    const graph = buildArticlePageGraph({
      article: { id: 'a0', title: 'Main' },
      recommendedArticles: Array.from({ length: 8 }, (_, i) => ({
        id: `r${i}`,
        title: `R${i}`
      }))
    });
    const input = articleSchemaFromGraph(graph);
    expect(input?.mentions?.length).toBe(4);
  });

  it('authorPersonFromCms requires validating extras; no invented fields', () => {
    expect(authorPersonFromCms('Just a string')).toBeUndefined();
    expect(authorPersonFromCms({ name: 'Only Name' })).toBeUndefined();
    expect(authorPersonFromCms({ name: 'Pat', role: 'Writer' })).toEqual({
      name: 'Pat',
      jobTitle: 'Writer'
    });
    const rich = authorPersonFromCms({
      name: 'Pat',
      bio: 'Bio',
      socialLinks: { linkedin: 'https://linkedin.com/in/pat' }
    });
    expect(rich?.sameAs).toEqual(['https://linkedin.com/in/pat']);
    expect((rich as any)?.country).toBeUndefined();
  });

  it('safe wrapper isolates failures', () => {
    expect(safeArticleSchemaFromGraph(null)).toBeNull();
  });
});
