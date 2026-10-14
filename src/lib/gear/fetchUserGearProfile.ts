import {
  EMPTY_GEAR_PROFILE,
  normalizeUserGearProfile,
  type UserGearProfile,
} from '@/lib/gear/types';

export async function fetchUserGearProfile(
  nickname: string,
  options?: { useAccountApi?: boolean },
): Promise<UserGearProfile> {
  const url = options?.useAccountApi
    ? '/api/account/gear'
    : `/api/profiles/${encodeURIComponent(nickname)}/gear`;

  const res = await fetch(url, {
    credentials: 'include',
  });

  if (res.status === 404) {
    return { ...EMPTY_GEAR_PROFILE };
  }

  if (!res.ok) {
    throw new Error('Failed to load gear profile');
  }

  const data = await res.json() as Partial<UserGearProfile>;
  return normalizeUserGearProfile(data);
}
