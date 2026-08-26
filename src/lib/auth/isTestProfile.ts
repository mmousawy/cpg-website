import type { SearchResult } from '@/types/search';

import { isTestEmail } from '@/lib/auth/isTestEmail';

export type TestProfileFields = {
  email?: string | null;
  nickname?: string | null;
};

/** E2E and unit-test accounts — hidden from public site unless the e2e header is present. */
export function isTestProfile(profile: TestProfileFields | null | undefined): boolean {
  if (!profile) return false;
  if (isTestEmail(profile.email)) return true;
  const nickname = profile.nickname?.toLowerCase();
  return Boolean(nickname?.startsWith('test-'));
}

export function isPublicProfileAllowed(nickname: string, includeTestContent: boolean): boolean {
  if (includeTestContent) return true;
  return !isTestProfile({ nickname });
}

export function filterStreamPhotos<T extends { profile?: { nickname?: string | null } | null }>(
  photos: T[],
  includeTestContent: boolean,
): T[] {
  if (includeTestContent) return photos;
  return photos.filter((photo) => !isTestProfile({ nickname: photo.profile?.nickname }));
}

export function filterAlbumProfiles<T extends { profile?: { nickname?: string | null } | null }>(
  albums: T[],
  includeTestContent: boolean,
): T[] {
  if (includeTestContent) return albums;
  return albums.filter((album) => !isTestProfile({ nickname: album.profile?.nickname }));
}

export function filterMemberNicknames<T extends { nickname?: string | null }>(
  members: T[],
  includeTestContent: boolean,
): T[] {
  if (includeTestContent) return members;
  return members.filter((member) => !isTestProfile({ nickname: member.nickname }));
}

export function filterSearchResults(
  results: SearchResult[],
  includeTestContent: boolean,
): SearchResult[] {
  if (includeTestContent) return results;

  return results.filter((result) => {
    if (result.entity_type !== 'members' && result.entity_type !== 'photos' && result.entity_type !== 'albums') {
      return true;
    }

    const url = result.url ?? '';
    const nickMatch = url.match(/\/@([^/]+)/);
    if (nickMatch && isTestProfile({ nickname: decodeURIComponent(nickMatch[1]) })) {
      return false;
    }

    if (result.entity_type === 'members') {
      const subtitleNick = result.subtitle?.replace(/^@/, '').trim();
      if (subtitleNick && isTestProfile({ nickname: subtitleNick })) {
        return false;
      }
    }

    return true;
  });
}

export function filterChallengePhotos<T extends { profile_nickname?: string | null }>(
  photos: T[],
  includeTestContent: boolean,
): T[] {
  if (includeTestContent) return photos;
  return photos.filter((photo) => !isTestProfile({ nickname: photo.profile_nickname }));
}

export function filterEventAlbumPhotos<T extends { contributor?: { nickname?: string | null } | null }>(
  photos: T[],
  includeTestContent: boolean,
): T[] {
  if (includeTestContent) return photos;
  return photos.filter((photo) => !isTestProfile({ nickname: photo.contributor?.nickname }));
}
