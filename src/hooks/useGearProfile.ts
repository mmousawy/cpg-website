'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { fetchUserGearProfile } from '@/lib/gear/fetchUserGearProfile';
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
  const [prevNickname, setPrevNickname] = useState(nickname);
  const [prevAuthNickname, setPrevAuthNickname] = useState(authProfile?.nickname);
  const [prevEnabled, setPrevEnabled] = useState(enabled);
  const [prevSkipFetch, setPrevSkipFetch] = useState(skipFetch);

  if (
    nickname !== prevNickname
    || authProfile?.nickname !== prevAuthNickname
    || enabled !== prevEnabled
    || skipFetch !== prevSkipFetch
  ) {
    setPrevNickname(nickname);
    setPrevAuthNickname(authProfile?.nickname);
    setPrevEnabled(enabled);
    setPrevSkipFetch(skipFetch);
    if (!enabled && !skipFetch) {
      setProfile(null);
      setHydrated(false);
      setLoadError(null);
    } else if (enabled && !skipFetch) {
      setLoadError(null);
    }
  }

  useEffect(() => {
    if (!enabled || skipFetch) {
      return;
    }

    let cancelled = false;

    const isOwner = authProfile?.nickname === nickname;

    void (async () => {
      try {
        const next = await fetchUserGearProfile(nickname, {
          useAccountApi: isOwner,
        });

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
