/**
 * Article Data Transfer Object (DTO)
 *
 * `media` / `cloudinaryImage` / `cloudinaryImages` are intentionally NOT
 * included in the response. They were legacy mirrors of `imageUrl`
 * (`media.mainImage`, `cloudinaryImage.url`) that nothing in the frontend
 * ever reads (verified: no references anywhere in frontend/src). For
 * articles whose image is stored as an inline base64 data URI instead of a
 * real Cloudinary URL, the *un-fixed* version of this DTO defaulted these
 * fields to `{ mainImage: obj.imageUrl }` / `{ url: obj.imageUrl }` whenever
 * the raw doc didn't carry them — which re-embedded the *same* multi-hundred-
 * KB base64 string two more times in every single response, tripling payload
 * size for zero benefit. This was proven to be the single largest
 * contributor to Article Detail's 2-3s load time (measured: 470KB response,
 * 33%+ of which was this exact duplication, most of the rest being the one
 * legitimate `imageUrl` copy). Excluding them here is safe purely on
 * "unused" grounds; excluding them is also load-bearing for keeping the
 * repository/service-level Mongo projection (see article.service.js) from
 * being silently defeated by this DTO re-deriving the bloat from `imageUrl`.
 */
function toArticleDTO(doc) {
  if (!doc) return null;

  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };

  const articleId = obj._id ? obj._id.toString() : (obj.id || '');
  delete obj._id;
  delete obj.__v;

  return {
    id: articleId,
    slug: obj.slug || '',
    title: obj.title || '',
    description: obj.description || '',
    categoryId: obj.categoryId || 'general',
    status: obj.status || 'published',
    active: obj.active !== undefined ? obj.active : true,
    publishAt: obj.publishAt || obj.createdAt,
    imageUrl: obj.imageUrl || '',
    paragraphs: obj.paragraphs || [],
    blocks: obj.blocks || [],
    author: obj.author || { name: 'EVCorn Editorial', role: 'Staff Writer' },
    seo: obj.seo || { metaTitle: obj.title || '', metaDescription: obj.description || '' },
    relationships: obj.relationships || { relatedArticles: [], relatedVehicles: [], relatedBrands: [] },
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt
  };
}

function toArticleListDTO(docs) {
  if (!Array.isArray(docs)) return [];
  return docs.map(toArticleDTO);
}

module.exports = {
  toArticleDTO,
  toArticleListDTO
};
