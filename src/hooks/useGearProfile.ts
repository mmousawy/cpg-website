'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { isGearProfileEmpty } from '@/lib/gear/types';
import { fetchUserGearProfile } from '@/lib/gear/fetchUserGearProfile';
import { getGearProfile } from '@/lib/gear/storage';
import { saveUserGearProfile } from '@/lib/gear/saveUserGearProfile';
import { EMPTY_GEAR_PROFILE, type UserGearProfile } from '@/lib/gear/types';

type UseGearProfileOptions = {
  /** When false, skips fetch (e.g. parent already loads gear or controlled inventory). */
  enabled?: boolean;
  /** Profile from the server; used for first paint without a client fetch. */
  initialProfile?: UserGearProfile;
  /** When true, do not refetch on mount (pair with `initialProfile`). */
  skipFetch?: boolean;
};

export function useGearProfile(nickname: string, options?: UseGearProfileOptions) {
  const enabled = options?.enabled !== false && nickname.length > 0;
  const skipFetch = options?.skipFetch === true;
  const { profile: authProfile } = useAuth();
  const [profile, setProfile] = useState<UserGearProfile | null>(
    options?.initialProfile ?? null,
  );
  const [hydrated, setHydrated] = useState(skipFetch && options?.initialProfile !== undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (!skipFetch) {
        setProfile(null);
        setHydrated(false);
        setLoadError(null);
      }
      return;
    }

    if (skipFetch) {
      return;
    }

    let cancelled = false;
    setLoadError(null);

    const isOwner = authProfile?.nickname === nickname;

    void (async () => {
      try {
        const fromApi = await fetchUserGearProfile(nickname, {
          useAccountApi: isOwner,
        });

        let next = fromApi;
        if (isOwner) {
          const fromLocal = getGearProfile(nickname);
          if (isGearProfileEmpty(fromApi) && !isGearProfileEmpty(fromLocal)) {
            next = fromLocal;
          }
        }

        if (!cancelled) {
          setProfile(next);
          setHydrated(true);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load gear');
          setProfile({ ...EMPTY_GEAR_PROFILE });
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nickname, enabled, skipFetch, authProfile?.nickname]);

  const persist = useCallback(
    async (next: UserGearProfile) => {
      await saveUserGearProfile(nickname, next);
      setProfile(next);
    },
    [nickname],
  );

  return { profile, hydrated, persist, loadError };
}
