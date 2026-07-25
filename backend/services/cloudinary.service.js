const cloudinary = require('cloudinary').v2;

// Configure Cloudinary SDK using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Reusable Cloudinary Image Upload Helper
 * @param {String} fileInput - Base64 data string, remote URL, or local file path
 * @param {String} folderName - Target Cloudinary folder (default: 'evcorn')
 * @returns {Promise<Object>} Object containing secure_url, public_id, and metadata
 */
const uploadImage = async (fileInput, folderName = 'evcorn') => {
  try {
    const options = {
      folder: folderName,
      resource_type: 'auto',
      transformation: [
        { fetch_format: 'auto', quality: 'auto' } // Auto WebP compression & optimal quality
      ]
    };

    const result = await cloudinary.uploader.upload(fileInput, options);
    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};

/**
 * Reusable Cloudinary Buffer Upload Helper (For Multer memoryStorage)
 * @param {Buffer} buffer - File memory buffer
 * @param {String} folderName - Target Cloudinary folder (default: 'evcorn')
 * @returns {Promise<Object>} Object containing secure_url, public_id, and metadata
 */
const uploadBuffer = (buffer, folderName = 'evcorn') => {
  return new Promise((resolve, reject) => {
    const options = {
      folder: folderName,
      resource_type: 'auto',
      transformation: [
        { fetch_format: 'auto', quality: 'auto' }
      ]
    };

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        console.error('Cloudinary Buffer Upload Error:', error);
        return reject(error);
      }
      resolve({
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        original_filename: result.original_filename || ''
      });
    });

    stream.end(buffer);
  });
};

/**
 * Reusable Cloudinary Image Delete Helper
 * @param {String} publicId - Cloudinary asset public_id
 * @returns {Promise<Object>} Deletion status result
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Cloudinary Delete Error:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadBuffer,
  deleteImage
};
