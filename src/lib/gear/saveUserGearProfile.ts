import { clearGearProfileLocal } from '@/lib/gear/storage';
import type { UserGearProfile } from '@/lib/gear/types';

/**
 * Persist the user's gear profile to Supabase (account API).
 */
export async function saveUserGearProfile(
  nickname: string,
  profile: UserGearProfile,
): Promise<void> {
  const res = await fetch('/api/account/gear', {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profile),
  });

  if (!res.ok) {
    let message = 'Failed to save gear';
    try {
      const data = await res.json() as { message?: string };
      if (data.message) {
        message = data.message;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  clearGearProfileLocal(nickname);
}
