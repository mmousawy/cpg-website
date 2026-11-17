import type { Session, User } from '@supabase/supabase-js';
import type { MutableRefObject } from 'react';

import type { Profile } from '@/context/AuthContext';
import { cancelInactivityScheduleIfNeeded } from '@/lib/accountDeletion/cancelInactivitySchedule';
import { shouldSkipNotificationsAndEmails } from '@/lib/auth/isTestEmail';
import { isServiceAccountUserId } from '@/lib/auth/serviceAccount';
import type { ServerAuth, ServerProfile } from '@/utils/supabase/getServerAuth';
import { loadBrowserSupabase } from '@/utils/supabase/loadBrowserClient';

let ownProfileRequest: Promise<Profile | null> | null = null;

async function readOwnProfile(): Promise<Profile | null> {
  const supabase = await loadBrowserSupabase();
  const { data, error } = await supabase.rpc('get_own_profile');
  if (error) return null;
  let nextProfile = data as Profile | null;
  if (nextProfile?.deletion_scheduled_at && nextProfile.deletion_source === 'inactivity') {
    await cancelInactivityScheduleIfNeeded(supabase);
    const refetch = await supabase.rpc('get_own_profile');
    nextProfile = refetch.error ? null : (refetch.data as Profile | null);
  }
  return nextProfile;
}

/** One get_own_profile for the page load. Pass force for an explicit refresh. */
function loadOwnProfile(force = false): Promise<Profile | null> {
  if (!force && ownProfileRequest) return ownProfileRequest;
  const request = readOwnProfile();
  ownProfileRequest = request;
  return request;
}

function toServerProfile(profile: Profile): ServerProfile {
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    nickname: profile.nickname,
    avatar_url: profile.avatar_url,
    terms_accepted_at: profile.terms_accepted_at,
    under_review_at: profile.under_review_at,
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
      const nextProfile = await loadOwnProfile(force);
      if (
        nextProfile
        && (nextProfile.is_service_account === true || isServiceAccountUserId(userId))
      ) {
        await supabase.auth.signOut();
        clearSession();
        setProfile(null);
        return null;
      }

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

    const touchSessionActivity = async (userId: string): Promise<void> => {
      if (isServiceAccountUserId(userId)) {
        await supabase.auth.signOut();
        return;
      }
      const p = await loadOwnProfile();
      if (!p) return;
      if (p.is_service_account === true) {
        await supabase.auth.signOut();
        return;
      }
      if (p.deletion_scheduled_at && p.deletion_source === 'inactivity') {
        lastLoggedInUpdatedRef.current = null;
      }

      if (lastLoggedInUpdatedRef.current === userId) return;
      lastLoggedInUpdatedRef.current = userId;
      if (shouldSkipNotificationsAndEmails(p.email ?? null, { userId, isServiceAccount: p.is_service_account })) {
        return;
      }
      await supabase.from('profiles').update({ last_logged_in: new Date().toISOString() }).eq('id', userId);
    };

    const hasServerProfile = !!initialAuth?.profile;

    supabase.auth.getSession().then(async ({ data: { session: nextSession } }) => {
      if (!mounted) return;

      const userId = nextSession?.user?.id ?? null;
      setUser(nextSession?.user ?? null);
      setSessionState(nextSession);
      currentUserIdRef.current = userId;
      setIsLoading(false);
      markSessionReady();

      if (userId) {
        await touchSessionActivity(userId);
        if (!hasServerProfile) {
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
      const previousUserId = currentUserIdRef.current;
      const userChanged = userId !== previousUserId;

      setUser(nextSession?.user ?? null);
      setSessionState(nextSession);
      currentUserIdRef.current = userId;

      // getSession already bootstrapped this user. SIGNED_IN on load is the same login.
      if (event === 'SIGNED_IN' && userId && userId === previousUserId) return;

      if (userChanged) {
        if (userId) {
          if (event === 'SIGNED_IN') {
            void touchSessionActivity(userId);
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
  return loadOwnProfile(true);
}
