import type { Metadata } from 'next';
import { stripHtml } from '@/utils/stripHtml';

/**
 * Site-wide configuration for metadata
 */
export const siteConfig = {
  name: 'Creative Photography Group',
  shortName: 'CPG',
  description: 'Shoot, share, explore! 📸 Hosting monthly photography meetups and photo walks in the Netherlands.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://creativephotographygroup.com',
  twitterHandle: '@CreativePhotoGR', // Update if you have a Twitter handle
};

/**
 * Default OpenGraph image path (relative to app directory)
 */
export const defaultOgImage = '/opengraph-image.jpg';

/**
 * Default Twitter image path (relative to app directory)
 */
export const defaultTwitterImage = '/twitter-image.jpg';

/**
 * Build a social preview image URL with OG-friendly dimensions.
 *
 * For Supabase-hosted images this returns a transformed URL that is cropped
 * to 1200x630 so social platforms (Discord, X, etc.) do not stretch/crop an
 * arbitrary source image unexpectedly.
 */
export function getSocialImageUrl(
  imageUrl: string | null | undefined,
  options: { width?: number; height?: number; quality?: number } = {},
): string | null {
  if (!imageUrl) return null;

  const { width = 1200, height = 630, quality = 92 } = options;

  try {
    const parsed = new URL(imageUrl);
    const isSupabaseStorageObjectUrl = parsed.pathname.includes('/storage/v1/object/public/');

    if (!isSupabaseStorageObjectUrl) {
      return imageUrl;
    }

    parsed.pathname = parsed.pathname.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/',
    );
    parsed.searchParams.set('width', String(width));
    parsed.searchParams.set('height', String(height));
    parsed.searchParams.set('resize', 'cover');
    parsed.searchParams.set('quality', String(quality));

    return parsed.toString();
  } catch {
    return imageUrl;
  }
}

/**
 * Truncate description to optimal length for SEO (155 characters)
 */
export function truncateDescription(description: string, maxLength = 155): string {
  const text = stripHtml(description || '');
  if (text.length <= maxLength) return text;
  // Truncate at word boundary
  const truncated = text.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}

/**
 * Format a profile name for page titles: "Full Name (@nickname)".
 * Falls back to "@nickname" when no full name is set.
 */
export function formatProfileDisplayName(
  fullName: string | null | undefined,
  nickname: string | null | undefined,
): string {
  const nick = nickname?.trim();
  if (!nick) return fullName?.trim() || 'Unknown';

  const atNickname = `@${nick}`;
  const name = fullName?.trim();
  if (name) return `${name} (${atNickname})`;
  return atNickname;
}

/**
 * Create a full URL from a relative or absolute path
 */
export function getAbsoluteUrl(path: string): string {
  // If already absolute URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Remove leading slash if present, then add it back after base URL
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${siteConfig.url}${cleanPath}`;
}

/**
 * Options for creating metadata
 */
export interface CreateMetadataOptions {
  title?: string;
  description?: string;
  image?: string | null;
  /** When true, omit og/twitter image tags so a colocated opengraph-image route can supply them */
  omitImages?: boolean;
  noindex?: boolean;
  nofollow?: boolean;
  canonical?: string;
  keywords?: string[];
  type?: 'website' | 'article' | 'profile';
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * Create comprehensive metadata object with OpenGraph and Twitter cards
 */
export function createMetadata(options: CreateMetadataOptions): Metadata {
  const {
    title,
    description = siteConfig.description,
    image,
    omitImages = false,
    noindex = false,
    nofollow = false,
    canonical,
    keywords,
    type = 'website',
    publishedTime,
    modifiedTime,
  } = options;

  // Use provided image or fall back to default
  const ogImage = image ? getAbsoluteUrl(image) : getAbsoluteUrl(defaultOgImage);
  const twitterImage = image ? getAbsoluteUrl(image) : getAbsoluteUrl(defaultTwitterImage);

  // Truncate description for SEO
  const truncatedDescription = truncateDescription(description);

  // Browser tab title uses the root layout template; OG/Twitter need the full title explicitly
  const fullTitle = title ? `${title} - ${siteConfig.name}` : siteConfig.name;

  // Note: Title template from root layout will automatically append "- Creative Photography Group"
  // We just pass the title as-is and let Next.js apply the template
  const metadata: Metadata = {
    ...(title && { title }),
    description: truncatedDescription,
    ...(keywords && keywords.length > 0 && { keywords: keywords.join(', ') }),
    robots: {
      index: !noindex,
      follow: !nofollow,
      ...(noindex && { 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 }),
    },
    ...(canonical && {
      alternates: {
        canonical: getAbsoluteUrl(canonical),
      },
    }),
    openGraph: {
      type,
      locale: 'en_US',
      url: canonical ? getAbsoluteUrl(canonical) : siteConfig.url,
      siteName: siteConfig.name,
      title: fullTitle,
      description: truncatedDescription,
      ...(!omitImages && {
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: fullTitle,
          },
        ],
      }),
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: truncatedDescription,
      ...(!omitImages && { images: [twitterImage] }),
      ...(siteConfig.twitterHandle && { creator: siteConfig.twitterHandle }),
    },
  };

  return metadata;
}

/**
 * Create metadata for pages that should not be indexed (auth, admin, etc.)
 * Uses absolute title to ensure the suffix is always present,
 * even during client-side navigation where title templates may not apply.
 */
export function createNoIndexMetadata(options: Omit<CreateMetadataOptions, 'noindex'>): Metadata {
  const metadata = createMetadata({
    ...options,
    noindex: true,
    nofollow: true,
  });

  if (options.title) {
    metadata.title = { absolute: `${options.title} - ${siteConfig.name}` };
  }

  return metadata;
}
