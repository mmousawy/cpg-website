import type { Session, User } from '@supabase/supabase-js';
import type { MutableRefObject } from 'react';

import type { Profile } from '@/context/AuthContext';
import type { ServerAuth, ServerProfile } from '@/utils/supabase/getServerAuth';
import { loadBrowserSupabase } from '@/utils/supabase/loadBrowserClient';

function toServerProfile(profile: Profile): ServerProfile {
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    nickname: profile.nickname,
    avatar_url: profile.avatar_url,
    terms_accepted_at: profile.terms_accepted_at,
    is_admin: !!profile.is_admin,
  };
}

type BindAuthSessionOptions = {
  initialAuth?: ServerAuth;
  hasInitialAuth: boolean;
  setUser: (user: User | null) => void;
  setSessionState: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsLoading: (loading: boolean) => void;
  currentUserIdRef: MutableRefObject<string | null>;
  fetchingProfileRef: MutableRefObject<string | null>;
  lastLoggedInUpdatedRef: MutableRefObject<string | null>;
  setSession: (auth: ServerAuth) => void;
  clearSession: () => void;
  markSessionReady: () => void;
  refresh: () => void;
};

export function bindAuthSession(options: BindAuthSessionOptions): () => void {
  let mounted = true;
  const {
    initialAuth,
    hasInitialAuth,
    setUser,
    setSessionState,
    setProfile,
    setIsLoading,
    currentUserIdRef,
    fetchingProfileRef,
    lastLoggedInUpdatedRef,
    setSession,
    clearSession,
    markSessionReady,
    refresh,
  } = options;

  const syncSessionContext = (nextUser: User | null, nextProfile: Profile | null) => {
    if (nextUser && nextProfile) {
      setSession({ user: nextUser, profile: toServerProfile(nextProfile) });
      return;
    }
    if (!nextUser) {
      clearSession();
    }
  };

  const fetchProfile = async (userId: string, force = false) => {
    if (!force && fetchingProfileRef.current === userId) return null;

    fetchingProfileRef.current = userId;

    try {
      const supabase = await loadBrowserSupabase();
      const { data, error } = await supabase.rpc('get_own_profile');

      const nextProfile = error ? null : (data as Profile | null);
      setProfile(nextProfile);
      if (nextProfile) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user) {
          syncSessionContext(currentSession.user, nextProfile);
        }
      }
      return nextProfile;
    } catch {
      setProfile(null);
      return null;
    } finally {
      if (fetchingProfileRef.current === userId) {
        fetchingProfileRef.current = null;
      }
    }
  };

  let unsubscribe: (() => void) | undefined;

  void (async () => {
    const supabase = await loadBrowserSupabase();
    if (!mounted) return;

    const updateLastLoggedIn = (userId: string): void => {
      if (lastLoggedInUpdatedRef.current === userId) return;
      lastLoggedInUpdatedRef.current = userId;
      supabase.from('profiles').update({ last_logged_in: new Date().toISOString() }).eq('id', userId).then(() => {});
    };

    const forceProfileRefresh = !initialAuth?.profile;

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      if (!mounted) return;

      const userId = nextSession?.user?.id ?? null;
      setUser(nextSession?.user ?? null);
      setSessionState(nextSession);
      currentUserIdRef.current = userId;
      setIsLoading(false);
      markSessionReady();

      if (userId) {
        updateLastLoggedIn(userId);
        if (!hasInitialAuth || forceProfileRefresh) {
          void fetchProfile(userId);
        }
      }
    }).catch(() => {
      if (mounted) {
        setIsLoading(false);
        markSessionReady();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted || event === 'INITIAL_SESSION') return;

      const userId = nextSession?.user?.id ?? null;
      const userChanged = userId !== currentUserIdRef.current;

      setUser(nextSession?.user ?? null);
      setSessionState(nextSession);
      currentUserIdRef.current = userId;

      if (userChanged) {
        if (userId) {
          if (event === 'SIGNED_IN') {
            updateLastLoggedIn(userId);
          }
          void fetchProfile(userId);
        } else {
          setProfile(null);
          lastLoggedInUpdatedRef.current = null;
          clearSession();
          refresh();
        }
      }
    });

    unsubscribe = () => subscription.unsubscribe();
  })();

  return () => {
    mounted = false;
    unsubscribe?.();
  };
}

export async function fetchOwnProfile(): Promise<Profile | null> {
  const supabase = await loadBrowserSupabase();
  const { data, error } = await supabase.rpc('get_own_profile');
  return error ? null : (data as Profile | null);
}
