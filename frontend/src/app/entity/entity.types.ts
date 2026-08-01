/**
 * Phase 7.3 Entity Graph — shared types (ephemeral; never CMS-persisted).
 */

export type EntityType =
  | 'brand'
  | 'model'
  | 'variant'
  | 'article'
  | 'author'
  | 'image'
  | 'facet'
  | 'faqSet'
  | 'comparePair';

export type EdgeType =
  | 'brand_has_model'
  | 'model_has_variant'
  | 'variant_sibling'
  | 'article_about_vehicle'
  | 'article_about_brand'
  | 'article_related_article'
  | 'recommended_vehicle'
  | 'recommended_article'
  | 'compares_with'
  | 'has_image'
  | 'authored_by'
  | 'has_facet'
  | 'faq_about';

export type EntityEdgeSource = 'structural' | 'editorial' | 'recommendation' | 'derived';

export interface EntityRef {
  type: EntityType;
  id: string;
}

export interface EntityNode {
  type: EntityType;
  id: string;
  name: string;
  href?: string;
  aliases?: string[];
  attrs: Record<string, unknown>;
  updatedAt?: string;
  imageUrl?: string;
}

export interface EntityEdge {
  type: EdgeType;
  from: EntityRef;
  to: EntityRef;
  href?: string;
  weight?: number;
  source: EntityEdgeSource;
}

export interface EntityGraph {
  nodes: EntityNode[];
  edges: EntityEdge[];
}

/** Caps locked in Phase 7.3 architecture §5.5 */
export const ENTITY_RELATED_VEHICLES_MAX = 6;
export const ENTITY_RELATED_ARTICLES_MAX = 4;
export const ENTITY_COMPARE_EDGES_MAX = 3;

export interface NormalizedArticleRelationships {
  relatedArticleIds: string[];
  relatedVehicleIds: string[];
  relatedBrandIds: string[];
}
