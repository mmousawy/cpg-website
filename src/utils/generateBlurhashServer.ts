/**
 * Server-side blurhash generation using sharp.
 * Use only in server context (API routes, server components, scripts).
 */

import { encode } from 'blurhash';
import sharp from 'sharp';

import { getBlurhashDimensions } from './decodeBlurhash';

/**
 * Generate blurhash from an image buffer (ArrayBuffer or Buffer).
 * Preserves aspect ratio with max 32px on longest side.
 */
export async function generateBlurhashFromBuffer(
  buffer: ArrayBuffer | Buffer,
  componentX = 4,
  componentY = 4,
): Promise<string | null> {
  try {
    const imageBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width || 32;
    const originalHeight = metadata.height || 32;

    const dims = getBlurhashDimensions(originalWidth, originalHeight, 32);

    const { data, info } = await sharp(imageBuffer)
      .resize(dims.width, dims.height, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const blurhash = encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      componentX,
      componentY,
    );

    return blurhash;
  } catch (error) {
    console.warn('Failed to generate blurhash from buffer:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Get image dimensions from a buffer.
 */
export async function getImageDimensionsFromBuffer(
  buffer: ArrayBuffer | Buffer,
): Promise<{ width: number; height: number } | null> {
  try {
    const imageBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const metadata = await sharp(imageBuffer).metadata();

    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }

    return null;
  } catch {
    return null;
  }
}
