import multer from 'multer';

// Use memory storage so sharp can process buffers directly
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Photos only - reject any videos or non-image types
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type '${file.mimetype}'. Only JPEG, PNG, WebP, and HEIC photos are allowed. Videos are not supported.`
      ),
      false
    );
  }
};

export const uploadPhotos = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
    files: 3, // 1 to 3 images
  },
  fileFilter,
});
