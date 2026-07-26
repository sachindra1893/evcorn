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
    title: obj.title,
    description: obj.description || '',
    categoryId: obj.categoryId || 'general',
    imageUrl: obj.imageUrl || '',
    paragraphs: obj.paragraphs || [],
    blocks: obj.blocks || [],
    active: obj.active !== undefined ? obj.active : true,
    cloudinaryImage: obj.cloudinaryImage || { url: obj.imageUrl || '', public_id: '' },
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
