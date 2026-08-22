import { siteConfig } from '@/utils/metadata';

export type ShareLinks = {
  facebook: string;
  x: string;
  whatsapp: string;
  pinterest?: string;
};

export type GetShareLinksOptions = {
  url: string;
  title: string;
  text?: string;
  image?: string | null;
};

/**
 * Full share title including site name, matching Open Graph metadata.
 */
export function formatShareTitle(pageTitle: string, siteName = siteConfig.name): string {
  const trimmed = pageTitle.trim();
  if (!trimmed) return siteName;
  return `${trimmed} - ${siteName}`;
}

/**
 * Build platform share intent URLs for the desktop popover fallback.
 * Instagram has no web intent — handled as a copy-link action in the UI.
 */
export function getShareLinks(options: GetShareLinksOptions): ShareLinks {
  const { url, title, text, image } = options;
  const shareText = text ?? title;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);

  const links: ShareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`,
  };

  if (image) {
    links.pinterest = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(image)}&description=${encodedText}`;
  }

  return links;
}

export type PhotoSharePathOptions = {
  nickname: string;
  shortId: string;
  albumSlug?: string | null;
  challengeSlug?: string | null;
  eventSlug?: string | null;
};

/**
 * Canonical photo path preserving album, challenge, or event context.
 */
export function getPhotoSharePath({
  nickname,
  shortId,
  albumSlug,
  challengeSlug,
  eventSlug,
}: PhotoSharePathOptions): string {
  if (challengeSlug) {
    return `/challenges/${challengeSlug}/photo/${shortId}`;
  }

  if (eventSlug) {
    return `/events/${eventSlug}/photo/${shortId}`;
  }

  if (albumSlug) {
    return `/@${nickname}/album/${albumSlug}/photo/${shortId}`;
  }

  return `/@${nickname}/photo/${shortId}`;
}
