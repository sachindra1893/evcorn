/**
 * Category / Brand Data Transfer Object (DTO)
 */
function toCategoryDTO(doc) {
  if (!doc) return null;

  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };

  delete obj._id;
  delete obj.__v;

  const logoUrl = obj.logoUrl || obj.logo || '';

  return {
    id: obj.id,
    name: obj.name,
    logo: logoUrl,
    logoUrl: logoUrl,
    cloudinaryLogo: obj.cloudinaryLogo || { url: logoUrl, public_id: '' }
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
