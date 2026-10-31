/** Hostname fragments for known social platforms (aligned with socialIcons keywords). */
export const SOCIAL_HOST_KEYWORDS = [
  'twitter.com',
  'x.com',
  'instagram.com',
  'threads.net',
  'bsky.app',
  'tiktok.com',
  'facebook.com',
  'fb.com',
  'linkedin.com',
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'pinterest.com',
  'snapchat.com',
  'reddit.com',
  'mastodon.',
  'flickr.com',
  'behance.net',
  'dribbble.com',
  'github.com',
  'medium.com',
  'twitch.tv',
  'discord.com',
  'discord.gg',
  'whatsapp.com',
  'wa.me',
  'bluesky',
] as const;

const PLATFORM_LABELS: { keywords: string[]; label: string }[] = [
  { keywords: ['instagram.com'], label: 'Instagram' },
  { keywords: ['twitter.com', 'x.com'], label: 'X' },
  { keywords: ['threads.net'], label: 'Threads' },
  { keywords: ['bsky.app', 'bluesky'], label: 'Bluesky' },
  { keywords: ['tiktok.com'], label: 'TikTok' },
  { keywords: ['facebook.com', 'fb.com'], label: 'Facebook' },
  { keywords: ['linkedin.com'], label: 'LinkedIn' },
  { keywords: ['youtube.com', 'youtu.be'], label: 'YouTube' },
  { keywords: ['vimeo.com'], label: 'Vimeo' },
  { keywords: ['pinterest.com'], label: 'Pinterest' },
  { keywords: ['flickr.com'], label: 'Flickr' },
  { keywords: ['behance.net'], label: 'Behance' },
  { keywords: ['dribbble.com'], label: 'Dribbble' },
  { keywords: ['github.com'], label: 'GitHub' },
  { keywords: ['medium.com'], label: 'Medium' },
  { keywords: ['mastodon.'], label: 'Mastodon' },
  { keywords: ['reddit.com'], label: 'Reddit' },
  { keywords: ['discord.com', 'discord.gg'], label: 'Discord' },
  { keywords: ['whatsapp.com', 'wa.me'], label: 'WhatsApp' },
];

export function isKnownSocialHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SOCIAL_HOST_KEYWORDS.some((kw) => host.includes(kw));
  } catch {
    return false;
  }
}

export function socialPlatformLabel(url: string): string {
  const lower = url.toLowerCase();
  for (const { keywords, label } of PLATFORM_LABELS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return label;
    }
  }
  return 'Social';
}

export function normalizeProfileUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = '';
    let path = parsed.pathname.replace(/\/+$/, '') || '';
    parsed.pathname = path;
    return parsed.toString().toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}
