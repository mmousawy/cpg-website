import { getDomain } from '@/utils/socialIcons';
import { isKnownSocialHost, socialPlatformLabel } from '@/lib/profileUrl/socialHosts';

export function profileOutboundLinkLabel(url: string, isWebsiteField: boolean): string {
  if (isWebsiteField) {
    return getDomain(url);
  }
  if (isKnownSocialHost(url)) {
    return socialPlatformLabel(url);
  }
  return getDomain(url);
}

export function profileSocialLinkRel(): string {
  return 'nofollow ugc noopener noreferrer';
}

export function profileWebsiteRel(): string {
  return 'noopener noreferrer';
}
