import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicUploadsDir = path.join(__dirname, '../../public/uploads');

// Ensure local uploads directory exists
if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
}

const configureCloudinary = () => {
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'placeholder' &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_KEY !== 'placeholder' &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== 'placeholder'
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    return true;
  }
  return false;
};

export const isCloudinaryConfigured = () => {
  return configureCloudinary();
};

export const uploadImage = async (buffer, { folder = 'urbanfix/reports', filename = null } = {}) => {
  if (isCloudinaryConfigured()) {
    try {
      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
            public_id: filename || undefined,
          },
          (error, result) => {
            if (error) {
              console.error('[Cloudinary] Upload error:', error.message);
              return reject(error);
            }
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
            });
          }
        );
        uploadStream.end(buffer);
      });
    } catch (err) {
      console.warn('[Storage] Cloudinary upload failed, falling back to local disk storage:', err.message);
    }
  }

  // Local fallback storage for development without Cloudinary credentials or on Cloudinary error
  const safeFilename = filename ? `${filename.replace(/[/\\?%*:|"<>]/g, '_')}.jpg` : `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
  const filePath = path.join(publicUploadsDir, safeFilename);
  await fs.promises.writeFile(filePath, buffer);

  return {
    url: `/uploads/${safeFilename}`,
    publicId: safeFilename,
    width: 1280,
    height: 720,
  };
};

export const deleteImage = async (publicId) => {
  if (!publicId) return;
  try {
    if (isCloudinaryConfigured()) {
      await cloudinary.uploader.destroy(publicId);
      return;
    }
    const filePath = path.join(publicUploadsDir, publicId);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.error('[Storage] Error deleting image:', err.message);
  }
};

