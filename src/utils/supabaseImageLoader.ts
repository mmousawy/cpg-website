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
 * Custom image loader that uses Supabase transformations for Supabase-hosted images.
 *
 * Note: External images (gravatar, discord, google, meetupstatic, etc.) are returned
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

    // Add Supabase transform params
    url.searchParams.set('width', width.toString());
    url.searchParams.set('quality', (quality || 85).toString());

    return url.toString();
  }

  // For other remote images (gravatar, discord, google, meetupstatic, etc.)
  // We must include width in URL to satisfy Next.js loader requirements
  // Adding width as a query param (most CDNs ignore unknown params)
  if (typeof imageSrc === 'string') {
    const separator = imageSrc.includes('?') ? '&' : '?';
    return `${imageSrc}${separator}w=${width}`;
  }
  return String(imageSrc);
}
