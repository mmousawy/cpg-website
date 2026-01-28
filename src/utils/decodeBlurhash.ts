import { decode } from 'blurhash';

/**
 * Convert RGBA pixels to a BMP data URL.
 * Works on both server (Node.js) and client (browser) - no canvas needed.
 */
function rgbaPixelsToDataURL(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): string {
  // BMP with 24-bit color (no alpha)
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const headerSize = 54;
  const fileSize = headerSize + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // BMP File Header (14 bytes)
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4D); // 'M'
  view.setUint32(2, fileSize, true); // File size
  view.setUint32(6, 0, true); // Reserved
  view.setUint32(10, headerSize, true); // Pixel data offset

  // DIB Header (BITMAPINFOHEADER - 40 bytes)
  view.setUint32(14, 40, true); // DIB header size
  view.setInt32(18, width, true); // Width
  view.setInt32(22, -height, true); // Height (negative = top-down)
  view.setUint16(26, 1, true); // Color planes
  view.setUint16(28, 24, true); // Bits per pixel
  view.setUint32(30, 0, true); // Compression (none)
  view.setUint32(34, pixelArraySize, true); // Image size
  view.setUint32(38, 2835, true); // Horizontal resolution (72 DPI)
  view.setUint32(42, 2835, true); // Vertical resolution (72 DPI)
  view.setUint32(46, 0, true); // Colors in palette
  view.setUint32(50, 0, true); // Important colors

  // Pixel data (BGR format, rows padded to 4-byte boundary)
  let offset = headerSize;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      view.setUint8(offset++, pixels[i + 2]); // B
      view.setUint8(offset++, pixels[i + 1]); // G
      view.setUint8(offset++, pixels[i]); // R
    }
    // Row padding to 4-byte boundary
    const padding = rowSize - width * 3;
    for (let p = 0; p < padding; p++) {
      view.setUint8(offset++, 0);
    }
  }

  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  // Use btoa (available in Node 16+ and all browsers)
  return `data:image/bmp;base64,${btoa(binary)}`;
}

/**
 * Decode a blurhash string to a base64 data URL.
 * Works on both server (SSR) and client - no canvas needed.
 *
 * @param blurhash - The blurhash string to decode
 * @param width - Output width (default 32)
 * @param height - Output height (default 32)
 * @returns Base64 data URL or null if decoding fails
 */
export function blurhashToDataURL(
  blurhash: string | null | undefined,
  width: number = 32,
  height: number = 32,
): string | null {
  if (!blurhash) return null;

  try {
    const pixels = decode(blurhash, width, height);
    return rgbaPixelsToDataURL(pixels, width, height);
  } catch (error) {
    console.warn('Failed to decode blurhash:', error);
    return null;
  }
}
