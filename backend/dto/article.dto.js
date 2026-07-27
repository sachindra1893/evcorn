/**
 * Article Data Transfer Object (DTO)
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
    media: obj.media || { mainImage: obj.imageUrl || '' },
    seo: obj.seo || { metaTitle: obj.title || '', metaDescription: obj.description || '' },
    relationships: obj.relationships || { relatedArticles: [], relatedVehicles: [], relatedBrands: [] },
    cloudinaryImage: obj.cloudinaryImage || { url: obj.imageUrl || '', public_id: '' },
    cloudinaryImages: obj.cloudinaryImages || [],
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
