import type { ImageLoaderProps } from 'next/image';

// Supabase storage domains
const SUPABASE_DOMAINS = [
  'db.creativephotography.group',
  'lpdjlhlslqtdswhnchmv.supabase.co',
];

/**
 * Check if a URL is a Supabase Storage URL
 */
export function isSupabaseUrl(src: string): boolean {
  return SUPABASE_DOMAINS.some(domain => src.includes(domain));
}

/**
 * Get a small placeholder URL for blur effect (32px, low quality)
 * Only works for Supabase-hosted images
 */
export function getBlurPlaceholderUrl(src: string | null | undefined): string | null {
  if (!src || typeof src !== 'string') return null;

  if (!isSupabaseUrl(src)) return null;

  try {
    const url = new URL(src);
    url.searchParams.delete('width');
    url.searchParams.delete('height');
    url.searchParams.delete('quality');
    url.searchParams.delete('resize');

    // Convert to render/image endpoint for transformations
    url.pathname = url.pathname.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/',
    );

    // Request small image for blur placeholder (32px gives smoother blur than 16px)
    url.searchParams.set('width', '32');
    url.searchParams.set('quality', '30');

    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Get a cropped thumbnail URL for Supabase images with a specific aspect ratio.
 * Crops images using resize=cover, center-cropping to match the aspect ratio.
 *
 * @param src - Original image URL
 * @param width - Target width
 * @param height - Target height
 * @param quality - Image quality (default: 85)
 */
export function getCroppedThumbnailUrl(
  src: string | null | undefined,
  width: number,
  height: number,
  quality: number = 85,
): string | null {
  if (!src || typeof src !== 'string') return null;

  if (!isSupabaseUrl(src)) return null;

  try {
    const url = new URL(src);
    url.searchParams.delete('width');
    url.searchParams.delete('height');
    url.searchParams.delete('quality');
    url.searchParams.delete('resize');

    // Convert object URL to render/image URL for transformations
    url.pathname = url.pathname.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/',
    );

    // Add crop parameters
    url.searchParams.set('width', width.toString());
    url.searchParams.set('height', height.toString());
    url.searchParams.set('resize', 'cover'); // Crop to fill dimensions (center-crop)
    url.searchParams.set('quality', quality.toString());

    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Get a square cropped thumbnail URL for Supabase images.
 * Crops images to square using resize=cover, center-cropping non-square images.
 *
 * @param src - Original image URL
 * @param size - Size for both width and height (default: 256)
 * @param quality - Image quality (default: 85)
 */
export function getSquareThumbnailUrl(
  src: string | null | undefined,
  size: number = 256,
  quality: number = 85,
): string | null {
  return getCroppedThumbnailUrl(src, size, size, quality);
}

/**
 * Custom image loader that uses Supabase transformations for Supabase-hosted images.
 *
 * Note: External images (discord, google, meetupstatic, etc.) are returned
 * as-is because Next.js doesn't proxy external URLs through /_next/image when using
 * a custom loader. They will load but won't be optimized.
 */
export default function supabaseImageLoader({ src, width, quality }: ImageLoaderProps): string {
  // Handle StaticImageData objects from static imports (extract the src string)
  const imageSrc = typeof src === 'string' ? src : (src as any).src || src;

  // Handle relative URLs (local images in /public and /_next/static)
  // With a custom loader, we must include width in the URL to satisfy Next.js
  // Adding width as a query param lets the image load (browsers ignore unknown params)
  if (typeof imageSrc === 'string' && imageSrc.startsWith('/')) {
    // For static imports (/_next/static/media/...), just add width param
    // For public images (/gallery/...), also add width param
    const separator = imageSrc.includes('?') ? '&' : '?';
    return `${imageSrc}${separator}w=${width}`;
  }

  // Check if this is a Supabase Storage URL
  const isSupabase = typeof imageSrc === 'string' && SUPABASE_DOMAINS.some(domain => imageSrc.includes(domain));

  if (isSupabase && typeof imageSrc === 'string') {
    // Check if URL already has resize=cover (from getSquareThumbnailUrl or getCroppedThumbnailUrl)
    // This indicates we want aspect-ratio cropping
    const existingUrl = new URL(imageSrc);
    const hasResizeCover = existingUrl.searchParams.get('resize') === 'cover';
    const existingHeight = existingUrl.searchParams.get('height');

    // Parse URL and remove any existing transform params to avoid conflicts
    const url = new URL(imageSrc);
    url.searchParams.delete('width');
    url.searchParams.delete('height');
    url.searchParams.delete('quality');
    url.searchParams.delete('resize');

    // Convert object URL to render/image URL for transformations
    // Supabase requires /render/image/public/ endpoint for image transformations
    url.pathname = url.pathname.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/',
    );

    // Cap width to prevent requesting huge images
    // Never request more than 2x the display size, regardless of DPR
    // This ensures good quality on retina displays without excessive bandwidth
    // The sizes prop already accounts for 2x, so we just need a reasonable absolute cap
    const maxWidth = 2400; // Absolute maximum (2x of 1200px typical max display)
    const cappedWidth = Math.min(width, maxWidth);

    // Add Supabase transform params
    url.searchParams.set('width', cappedWidth.toString());
    url.searchParams.set('quality', (quality || 85).toString());

    // If resize=cover was in the original URL, preserve aspect ratio cropping
    if (hasResizeCover && existingHeight) {
      // Calculate height based on original aspect ratio
      const originalHeight = parseInt(existingHeight, 10);
      const originalWidth = parseInt(existingUrl.searchParams.get('width') || width.toString(), 10);
      const aspectRatio = originalHeight / originalWidth;
      const newHeight = Math.round(width * aspectRatio);

      url.searchParams.set('height', newHeight.toString());
      url.searchParams.set('resize', 'cover'); // Crop to fill dimensions (center-crop)
    }

    return url.toString();
  }

  // For other remote images (discord, google, meetupstatic, etc.)
  // We must include width in URL to satisfy Next.js loader requirements
  // Adding width as a query param (most CDNs ignore unknown params)
  if (typeof imageSrc === 'string') {
    const separator = imageSrc.includes('?') ? '&' : '?';
    return `${imageSrc}${separator}w=${width}`;
  }
  return String(imageSrc);
}
