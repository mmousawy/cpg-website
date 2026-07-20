const DEFAULT_EMAIL_SITE_URL = 'https://creativephotography.group';

export function getEmailSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  const url = configuredUrl?.trim() || DEFAULT_EMAIL_SITE_URL;

  return url.replace(/\/$/, '');
}

export function toAbsoluteEmailUrl(link: string): string {
  if (!link) {
    return getEmailSiteUrl();
  }

  if (link.startsWith('http://') || link.startsWith('https://')) {
    return link;
  }

  return `${getEmailSiteUrl()}${link.startsWith('/') ? link : `/${link}`}`;
}

export function getEmailReplyToAddress(): string | undefined {
  return process.env.EMAIL_REPLY_TO_ADDRESS?.trim() || undefined;
}
