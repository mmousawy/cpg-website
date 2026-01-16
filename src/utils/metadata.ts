import type { Metadata } from 'next';

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
 * Truncate description to optimal length for SEO (155 characters)
 */
export function truncateDescription(description: string, maxLength = 155): string {
  if (description.length <= maxLength) {
    return description;
  }
  // Truncate at word boundary
  const truncated = description.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
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
      title: title || siteConfig.name,
      description: truncatedDescription,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title || siteConfig.name,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: 'summary_large_image',
      title: title || siteConfig.name,
      description: truncatedDescription,
      images: [twitterImage],
      ...(siteConfig.twitterHandle && { creator: siteConfig.twitterHandle }),
    },
  };

  return metadata;
}

/**
 * Create metadata for pages that should not be indexed (auth, admin, etc.)
 */
export function createNoIndexMetadata(options: Omit<CreateMetadataOptions, 'noindex'>): Metadata {
  return createMetadata({
    ...options,
    noindex: true,
    nofollow: true,
  });
}
