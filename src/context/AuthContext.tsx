'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import type { Database } from '@/database.types';
import { getPostLoginRedirect } from '@/utils/postLoginRedirect';
import { useSession } from '@/context/SessionContext';
import { loadBrowserSupabase, shouldLoadBrowserSupabase } from '@/utils/supabase/loadBrowserClient';
import type { ServerAuth, ServerProfile } from '@/utils/supabase/getServerAuth';

export type Profile = Database['public']['Tables']['profiles']['Row'];

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

export type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  updateProfileTheme: (theme: 'light' | 'dark' | 'midnight' | 'system') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
  signInWithDiscord: (redirectTo?: string) => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, bypassToken?: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({
  children,
  initialAuth,
}: {
  children: ReactNode;
  initialAuth?: ServerAuth;
}) {
  const router = useRouter();
  const { setSession, clearSession, markSessionReady } = useSession();
  const [user, setUser] = useState<User | null>(initialAuth?.user ?? null);
  const [session, setSessionState] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(
    (initialAuth?.profile as Profile | null) ?? null,
  );
  const [isLoading, setIsLoading] = useState(!initialAuth?.user);

  const currentUserIdRef = useRef<string | null>(initialAuth?.user?.id ?? null);
  const fetchingProfileRef = useRef<string | null>(null);
  const lastLoggedInUpdatedRef = useRef<string | null>(null);
  const hasInitialAuth = !!initialAuth?.user;

  const isAdmin = useMemo(() => !!profile?.is_admin, [profile]);

  const syncSessionContext = useCallback((nextUser: User | null, nextProfile: Profile | null) => {
    if (nextUser && nextProfile) {
      setSession({ user: nextUser, profile: toServerProfile(nextProfile) });
      return;
    }
    if (!nextUser) {
      clearSession();
    }
  }, [setSession, clearSession]);

  const fetchProfile = useCallback(async (userId: string, force = false) => {
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
  }, [syncSessionContext]);

  const refreshProfile = useCallback(async () => {
    if (currentUserIdRef.current) {
      await fetchProfile(currentUserIdRef.current, true);
    }
  }, [fetchProfile]);

  const updateProfileTheme = useCallback(async (theme: 'light' | 'dark' | 'midnight' | 'system') => {
    const userId = currentUserIdRef.current;
    if (!userId) {
      return { error: new Error('Not authenticated') };
    }

    const supabase = await loadBrowserSupabase();
    const { error } = await supabase
      .from('profiles')
      .update({ theme })
      .eq('id', userId);

    if (error) {
      return { error: new Error(error.message || 'Failed to update theme preference') };
    }

    setProfile((prev) => (prev ? { ...prev, theme } : null));
    return { error: null };
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const start = async () => {
      if (!shouldLoadBrowserSupabase()) {
        setIsLoading(false);
        markSessionReady();
        return;
      }

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
            fetchProfile(userId);
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
            fetchProfile(userId);
          } else {
            setProfile(null);
            lastLoggedInUpdatedRef.current = null;
            clearSession();
            router.refresh();
          }
        }
      });

      unsubscribe = () => subscription.unsubscribe();
    };

    void start();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [clearSession, fetchProfile, hasInitialAuth, initialAuth?.profile, markSessionReady, router]);

  const signOut = useCallback(async () => {
    const supabase = await loadBrowserSupabase();
    await supabase.auth.signOut();
    clearSession();
    router.refresh();
  }, [clearSession, router]);

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const supabase = await loadBrowserSupabase();
    const safePath = redirectTo ? getPostLoginRedirect(redirectTo) : null;
    const query = safePath ? `?redirectTo=${encodeURIComponent(safePath)}` : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth-callback${query}` },
    });
    return { error };
  }, []);

  const signInWithDiscord = useCallback(async (redirectTo?: string) => {
    const supabase = await loadBrowserSupabase();
    const safePath = redirectTo ? getPostLoginRedirect(redirectTo) : null;
    const query = safePath ? `?redirectTo=${encodeURIComponent(safePath)}` : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}/auth-callback${query}` },
    });
    return { error };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = await loadBrowserSupabase();
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };

    // Block login if account is scheduled for deletion
    if (data.user) {
      const { data: profileData, error: profileError } = await supabase.rpc('get_own_profile');
      const profile = profileError ? null : profileData as Profile | null;

      if (profile?.deletion_scheduled_at) {
        await supabase.auth.signOut();
        return { error: new Error('This account is scheduled for deletion. If you want to cancel the deletion, please contact us through the contact form.') };
      }

      if (profile?.suspended_at) {
        await supabase.auth.signOut();
        return { error: new Error('This account has been suspended. Please contact us if you believe this is an error.') };
      }
    }

    return { error: null };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, bypassToken?: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(bypassToken && { bypassToken }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as { message?: string };
        return { error: new Error(errorData.message || 'Failed to create account') };
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('An unexpected error occurred') };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as { message?: string };
        return { error: new Error(errorData.message || 'Failed to send reset email') };
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('An unexpected error occurred') };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const supabase = await loadBrowserSupabase();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error || null };
  }, []);

  const value = useMemo(() => ({
    user, session, profile, isLoading, isAdmin, refreshProfile, updateProfileTheme,
    signOut, signInWithGoogle, signInWithDiscord, signInWithEmail,
    signUpWithEmail, resetPassword, updatePassword,
  }), [user, session, profile, isLoading, isAdmin, refreshProfile, updateProfileTheme, signOut,
    signInWithGoogle, signInWithDiscord, signInWithEmail, signUpWithEmail,
    resetPassword, updatePassword]);

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
