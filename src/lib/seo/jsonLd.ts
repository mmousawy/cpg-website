import { getAbsoluteUrl, getSocialImageUrl, siteConfig } from '@/utils/metadata';

export function getOrganizationJsonLd() {
  return {
    '@type': 'Organization' as const,
    name: siteConfig.name,
    url: siteConfig.url,
  };
}

/** Absolute, crawlable image URL using the same transform as social previews. */
export function getCrawlableImageUrl(imageUrl: string | null | undefined): string | null {
  const social = getSocialImageUrl(imageUrl);
  if (!social) return null;
  return getAbsoluteUrl(social);
}
