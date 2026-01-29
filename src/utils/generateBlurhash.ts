import { encode } from 'blurhash';

/**
 * Generate a blurhash from an image file, preserving aspect ratio
 * @param file - Image file to generate blurhash from
 * @param componentX - X component count (default: 4)
 * @param componentY - Y component count (default: 4)
 * @returns Promise resolving to blurhash string or null if generation fails
 */
export async function generateBlurhash(
  file: File,
  componentX: number = 4,
  componentY: number = 4,
): Promise<string | null> {
  try {
    // Create image element
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = URL.createObjectURL(file);
    });

    // Calculate dimensions preserving aspect ratio (max 32px on longest side)
    const maxSize = 32;
    let width: number;
    let height: number;
    if (img.naturalWidth > img.naturalHeight) {
      width = maxSize;
      height = Math.round((img.naturalHeight / img.naturalWidth) * maxSize);
    } else {
      height = maxSize;
      width = Math.round((img.naturalWidth / img.naturalHeight) * maxSize);
    }
    // Ensure minimum of 1px
    width = Math.max(1, width);
    height = Math.max(1, height);

    // Create canvas with correct aspect ratio
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    // Draw image to canvas (preserving aspect ratio)
    ctx.drawImage(img, 0, 0, width, height);

    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);

    // Generate blurhash
    const blurhash = encode(
      imageData.data,
      imageData.width,
      imageData.height,
      componentX,
      componentY,
    );

    // Clean up
    URL.revokeObjectURL(img.src);

    return blurhash;
  } catch (error) {
    console.warn('Failed to generate blurhash:', error);
    return null;
  }
}
