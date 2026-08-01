export type {
  EdgeType,
  EntityEdge,
  EntityEdgeSource,
  EntityGraph,
  EntityNode,
  EntityRef,
  EntityType,
  NormalizedArticleRelationships
} from './entity.types';

export {
  ENTITY_COMPARE_EDGES_MAX,
  ENTITY_RELATED_ARTICLES_MAX,
  ENTITY_RELATED_VEHICLES_MAX
} from './entity.types';

export { entitySlugify } from './entity-slug';

export type { ModelIdentityInput } from './entity-id';
export {
  articleEntityId,
  authorEntityId,
  brandEntityId,
  modelEntityId,
  resolveModelName,
  variantEntityId
} from './entity-id';

export type { ModelHrefInput } from './entity-href';
export {
  articleHref,
  articlesIndexHref,
  brandBrowseHref,
  compareHref,
  energyHref,
  evsIndexHref,
  faqsHref,
  modelHref,
  modelSpecsHref
} from './entity-href';

export type { ArticleLike, BrandLike, VehicleLike } from './entity-normalize';
export {
  compactArticleRelationships,
  normalizeArticleNode,
  normalizeArticleRelationships,
  normalizeBrandNode,
  normalizeModelNode,
  normalizeVariantNode
} from './entity-normalize';

export {
  ENTITY_GRAPH_CACHE_MAX_ENTRIES,
  clearEntityGraphCache,
  entityGraphCacheKey,
  entityGraphCacheSize,
  getCachedEntityGraph,
  setCachedEntityGraph
} from './entity-cache';

export type {
  AeoRelatedFromGraph,
  ArticleBlockLike,
  ArticlePageGraphContext,
  EntityGraphCacheStamp,
  GraphRelatedArticle,
  GraphRelatedComparison,
  GraphRelatedVehicle,
  VehiclePageGraphContext
} from './entity-graph';
export {
  EMPTY_ENTITY_GRAPH,
  aeoRelatedFromGraph,
  articleGraphCacheStamp,
  buildArticlePageGraph,
  buildVehiclePageGraph,
  comparisonsFromGraph,
  getOrBuildArticlePageGraph,
  getOrBuildVehiclePageGraph,
  primaryVehicleHintsFromGraph,
  relatedArticlesFromGraph,
  relatedVehiclesFromGraph,
  safeBuildArticlePageGraph,
  safeBuildVehiclePageGraph,
  vehicleGraphCacheStamp
} from './entity-graph';

export type {
  ArticleAuthorLike,
  ArticleSchemaGraphInput,
  SchemaAuthorPersonInput,
  SchemaBrandInput,
  SchemaThingRefInput,
  SchemaThingType,
  VehicleSchemaGraphInput
} from './entity-schema-bridge';
export {
  articleSchemaFromGraph,
  authorPersonFromCms,
  safeArticleSchemaFromGraph,
  safeVehicleSchemaFromGraph,
  vehicleSchemaFromGraph
} from './entity-schema-bridge';
