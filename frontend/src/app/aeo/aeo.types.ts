/**
 * Phase 7.2 AEO — derived page model (ephemeral, never CMS-persisted).
 * Generators fill sections independently; missing sources omit fields.
 */

export type IsoDateString = string;

export interface AeoTocItem {
  id: string;
  text: string;
  level: number;
}

export interface AeoSpecItem {
  label: string;
  value: string;
}

export interface AeoRelatedVehicle {
  id: string;
  name: string;
  href: string;
}

export interface AeoRelatedComparison {
  label: string;
  href: string;
}

export interface AeoRelatedArticle {
  id: string;
  title: string;
  href: string;
}

export interface AeoInternalLink {
  label: string;
  href: string;
}

export interface AeoFaqItem {
  question: string;
  answer: string;
}

export interface AeoTrust {
  authorLabel?: string;
  updatedLabel?: string;
  citationNote?: string;
}

export interface AeoCtas {
  compare?: { label: string; href: string };
  viewSpecs?: { label: string; href: string };
}

/**
 * Full AeoPageModel shape from architecture.
 * M1: quickAnswer, keyTakeaways, readingTimeMinutes, lastUpdated, toc, specSummary.
 * M2: buyingRecommendation, related*, internalLinks, faqs, trust, ctas.
 */
export interface AeoPageModel {
  quickAnswer?: string;
  keyTakeaways: string[];
  readingTimeMinutes?: number;
  lastUpdated?: IsoDateString;
  toc: AeoTocItem[];
  pros: string[];
  cons: string[];
  specSummary: AeoSpecItem[];
  buyingRecommendation?: string;
  relatedVehicles: AeoRelatedVehicle[];
  relatedComparisons: AeoRelatedComparison[];
  relatedArticles: AeoRelatedArticle[];
  internalLinks: AeoInternalLink[];
  faqs: AeoFaqItem[];
  trust?: AeoTrust;
  ctas: AeoCtas;
}

/** Model-level overview aggregates — shared with Phase 7.1 SEO description. */
export interface VehicleOverviewFacts {
  priceRange: string;
  batteryOptions: string;
  claimedRange: string;
  charging: string;
}

/** Light related vehicle DTO accepted as generator input (never fetched inside generators). */
export interface AeoRelatedVehicleInput {
  id?: string;
  name?: string;
  parentModel?: string;
  variantName?: string;
  /** Prefer category display name so hrefs match `/ev/{slugify(brandName)}/...` routes. */
  brandName?: string;
  brandSlug?: string;
  modelSlug?: string;
  categoryId?: string;
  imageUrl?: string;
  price?: string;
  range?: string;
}

/** Light related article DTO accepted as generator input. */
export interface AeoRelatedArticleInput {
  id?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
}

export interface AeoVehicleContext {
  brandName: string;
  modelName: string;
  brandSlug: string;
  modelSlug: string;
  /** Sibling variants already loaded for this model page — never the full catalog. */
  variants: AeoVehicleLike[];
  selectedVariant: AeoVehicleLike;
  /** Optional SEO override already on Vehicle schema. */
  seoMetaDescription?: string;
  /** Pre-fetched RecommendationService / relationship DTOs — wire layer only. */
  relatedVehicles?: AeoRelatedVehicleInput[];
  relatedArticles?: AeoRelatedArticleInput[];
}

export interface AeoArticleContext {
  id?: string;
  title: string;
  description?: string;
  paragraphs?: string[];
  blocks?: AeoBlockLike[];
  seoMetaDescription?: string;
  updatedAt?: string;
  publishAt?: string;
  publishedAt?: string;
  createdAt?: string;
  author?: { name?: string; role?: string } | string;
  brandSlug?: string;
  modelSlug?: string;
  /** Pre-fetched related DTOs — wire layer only (no HTTP in generators). */
  relatedVehicles?: AeoRelatedVehicleInput[];
  relatedArticles?: AeoRelatedArticleInput[];
  /** Explicit relationship ids from article schema / related blocks (optional resolve upstream). */
  relatedVehicleIds?: string[];
  relatedArticleIds?: string[];
}

/** Minimal vehicle shape generators need (CarSpec-compatible). */
export interface AeoVehicleLike {
  id?: string;
  name?: string;
  parentModel?: string;
  variantName?: string;
  price?: string;
  batteryCapacity?: string;
  range?: string;
  acCharging?: string;
  dcCharging?: string;
  drivetrain?: string;
  seating?: string;
  dimensions?: string;
  groundClearance?: string;
  bootFrunkSpace?: string;
  safetyRating?: string;
  adasLevel?: string;
  airbags?: string;
  bodyStyle?: string;
  wheelbase?: string;
  kerbWeight?: string;
  weight?: string;
  acceleration?: string;
  maxPower?: string;
  torque?: string;
  bhpTorque?: string;
  keyHighlights?: string;
  status?: string;
  updatedAt?: string;
  publishedAt?: string;
  createdAt?: string;
  seo?: { metaDescription?: string };
  pricing?: { priceText?: string; exShowroomPriceINR?: number };
  battery?: { capacityText?: string; capacityKWh?: number; chemistry?: string };
  charging?: { acChargingText?: string; dcChargingText?: string; acChargingKW?: number; dcFastChargingKW?: number };
  performance?: { rangeText?: string; claimedRangeKM?: number; drivetrain?: string };
  safety?: { safetyRatingText?: string; ncapRating?: number; airbagsCount?: number; hasADAS?: boolean };
}

export interface AeoBlockLike {
  id?: string;
  type: string;
  data?: Record<string, unknown>;
}

export function emptyAeoPageModel(): AeoPageModel {
  return {
    keyTakeaways: [],
    toc: [],
    pros: [],
    cons: [],
    specSummary: [],
    relatedVehicles: [],
    relatedComparisons: [],
    relatedArticles: [],
    internalLinks: [],
    faqs: [],
    ctas: {}
  };
}

/** True when any answer chrome section would render (skip empty shells). */
export function hasAeoChrome(model: AeoPageModel | null | undefined): boolean {
  if (!model) return false;
  return !!(
    model.quickAnswer ||
    model.buyingRecommendation ||
    model.keyTakeaways.length ||
    model.specSummary.length ||
    model.toc.length ||
    model.faqs.length ||
    model.relatedVehicles.length ||
    model.relatedComparisons.length ||
    model.relatedArticles.length ||
    model.internalLinks.length ||
    model.trust?.citationNote ||
    model.ctas.compare ||
    model.ctas.viewSpecs
  );
}

/**
 * Article top answer box only (TOC / related live outside this shell).
 * Prevents an empty bordered chrome when generation yields nothing useful.
 */
export function hasArticleAnswerChrome(model: AeoPageModel | null | undefined): boolean {
  if (!model) return false;
  return !!(
    model.quickAnswer ||
    model.keyTakeaways.length ||
    model.ctas.viewSpecs ||
    model.trust?.citationNote
  );
}
