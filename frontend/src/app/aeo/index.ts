export type {
  AeoArticleContext,
  AeoCtas,
  AeoFaqItem,
  AeoInternalLink,
  AeoPageModel,
  AeoRelatedArticle,
  AeoRelatedArticleInput,
  AeoRelatedComparison,
  AeoRelatedVehicle,
  AeoRelatedVehicleInput,
  AeoSpecItem,
  AeoTocItem,
  AeoTrust,
  AeoVehicleContext,
  AeoVehicleLike,
  IsoDateString,
  VehicleOverviewFacts
} from './aeo.types';

export {
  emptyAeoPageModel,
  hasAeoChrome,
  hasArticleAnswerChrome
} from './aeo.types';
export {
  AEO_ANSWER_BLOCKS_ENABLED,
  buildArticleAeo,
  buildVehicleAeo
} from './aeo-engine';
export {
  AEO_CACHE_MAX_ENTRIES,
  aeoCacheKey,
  aeoCacheSize,
  clearAeoCache,
  getCachedAeo,
  setCachedAeo
} from './aeo-cache';
export {
  buildVehicleOverviewFacts,
  buildVehicleSeoDescription,
  isUsableSpec
} from './vehicle-facts';
export {
  formatLastUpdatedLabel,
  resolveLastUpdated,
  resolveLastUpdatedFromVariants
} from './generators/last-updated';
export {
  generateArticleQuickAnswer,
  generateVehicleQuickAnswer
} from './generators/quick-answer.generator';
export {
  generateArticleTakeaways,
  generateVehicleTakeaways
} from './generators/takeaway.generator';
export {
  AEO_WORDS_PER_MINUTE,
  countArticleWords,
  generateReadingTimeMinutes
} from './generators/reading-time.generator';
export {
  generateArticleToc,
  generateVehicleToc,
  VEHICLE_TOC_SECTIONS
} from './generators/toc.generator';
export { generateSpecSummary } from './generators/spec-summary.generator';
export { generateBuyingRecommendation } from './generators/buying-recommendation.generator';
export { generateRelatedVehicles } from './generators/related-vehicle.generator';
export {
  collectRelatedArticleIds,
  generateRelatedArticles
} from './generators/related-article.generator';
export { generateRelatedComparisons } from './generators/related-comparison.generator';
export { generateInternalLinks } from './generators/internal-link.generator';
export {
  extractFaqItemsFromBlocks,
  generateArticleFaqs,
  generateVehicleFaqs
} from './generators/faq.generator';
export { generateTrust } from './generators/trust.generator';
export { generateCtas } from './generators/cta.generator';
