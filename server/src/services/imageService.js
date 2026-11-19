import sharp from 'sharp';
import crypto from 'crypto';

// Compute 64-bit Perceptual Hash (Difference/Average Hash)
export const computePerceptualHash = async (imageBuffer) => {
  try {
    // 8x8 grayscale image gives 64 pixels
    const { data } = await sharp(imageBuffer)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let sum = 0;
    for (let i = 0; i < 64; i++) {
      sum += data[i];
    }
    const avg = sum / 64;

    let hashBits = '';
    for (let i = 0; i < 64; i++) {
      hashBits += data[i] >= avg ? '1' : '0';
    }

    // Convert 64-bit binary string to 16-char hex
    let hexHash = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = hashBits.substring(i, i + 4);
      hexHash += parseInt(nibble, 2).toString(16);
    }
    return hexHash;
  } catch (err) {
    console.error('[ImageService] Failed to compute pHash:', err.message);
    return crypto.createHash('md5').update(imageBuffer).digest('hex').substring(0, 16);
  }
};

// Calculate Hamming distance between two hex hashes (0 to 64)
export const calculateHammingDistance = (hash1, hash2) => {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const val1 = parseInt(hash1[i], 16);
    const val2 = parseInt(hash2[i], 16);
    let xor = val1 ^ val2;
    // count set bits in 4-bit nibble
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
};

// Returns similarity between 0 and 1
export const calculateImageSimilarity = (hash1, hash2) => {
  const dist = calculateHammingDistance(hash1, hash2);
  return Math.max(0, 1 - dist / 64);
};

// Preprocess photo: strip EXIF, auto-rotate, convert to JPEG, max 1280px on longest side
export const preprocessPhoto = async (fileBuffer) => {
  // Validate magic bytes for common image formats (JPEG, PNG, WebP, HEIC)
  const isJpeg = fileBuffer[0] === 0xff && fileBuffer[1] === 0xd8;
  const isPng = fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x4e && fileBuffer[3] === 0x47;
  const isWebp = fileBuffer.slice(8, 12).toString('ascii') === 'WEBP';
  const isHeic = fileBuffer.slice(4, 12).toString('ascii').includes('ftyp');

  if (!isJpeg && !isPng && !isWebp && !isHeic) {
    throw new Error('Unsupported or invalid image format. Only JPEG, PNG, WebP, and HEIC are allowed.');
  }

  // Sharp pipeline
  const processed = sharp(fileBuffer)
    .rotate() // auto-orient based on EXIF
    .resize(1280, 1280, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, mozjpeg: true }); // strips EXIF metadata

  const processedBuffer = await processed.toBuffer();
  const metadata = await sharp(processedBuffer).metadata();
  const phash = await computePerceptualHash(processedBuffer);

  return {
    buffer: processedBuffer,
    mimeType: 'image/jpeg',
    width: metadata.width,
    height: metadata.height,
    phash,
  };
};
