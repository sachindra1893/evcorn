/**
 * Category / Brand Data Transfer Object (DTO)
 */
function toCategoryDTO(doc) {
  if (!doc) return null;

  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };

  delete obj._id;
  delete obj.__v;

  return {
    id: obj.id,
    name: obj.name,
    logo: obj.logo || '',
    cloudinaryLogo: obj.cloudinaryLogo || { url: obj.logo || '', public_id: '' },
    createdAt: obj.createdAt
  };
}

function toCategoryListDTO(docs) {
  if (!Array.isArray(docs)) return [];
  return docs.map(toCategoryDTO);
}

module.exports = {
  toCategoryDTO,
  toCategoryListDTO
};
