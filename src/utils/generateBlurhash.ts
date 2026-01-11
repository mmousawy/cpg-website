import { encode } from 'blurhash';

/**
 * Generate a blurhash from an image file
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

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 32; // Small size for performance
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    // Draw image to canvas
    ctx.drawImage(img, 0, 0, 32, 32);

    // Get image data
    const imageData = ctx.getImageData(0, 0, 32, 32);

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
