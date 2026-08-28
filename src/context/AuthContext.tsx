'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import type { Database } from '@/database.types';
import { useSession } from '@/context/SessionContext';
import { shouldLoadBrowserSupabase } from '@/utils/supabase/loadBrowserClient';
import type { ServerAuth } from '@/utils/supabase/getServerAuth';

export type Profile = Database['public']['Tables']['profiles']['Row'];

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

  useEffect(() => {
    if (!shouldLoadBrowserSupabase()) {
      setIsLoading(false);
      markSessionReady();
      return;
    }

    let cancelled = false;
    let unbind: (() => void) | undefined;

    void import('./authSessionRuntime').then(({ bindAuthSession }) => {
      if (cancelled) return;
      unbind = bindAuthSession({
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
        refresh: () => router.refresh(),
      });
    });

    return () => {
      cancelled = true;
      unbind?.();
    };
  }, [clearSession, hasInitialAuth, initialAuth?.profile, markSessionReady, router, setSession]);

  const refreshProfile = useCallback(async () => {
    if (!currentUserIdRef.current) return;
    const { fetchOwnProfile } = await import('./authSessionRuntime');
    const nextProfile = await fetchOwnProfile();
    setProfile(nextProfile);
  }, []);

  const updateProfileTheme = useCallback(async (theme: 'light' | 'dark' | 'midnight' | 'system') => {
    const userId = currentUserIdRef.current;
    if (!userId) {
      return { error: new Error('Not authenticated') };
    }

    const { updateProfileThemeInDb } = await import('./authActions');
    const result = await updateProfileThemeInDb(userId, theme);
    if (result.error) return result;

    setProfile((prev) => (prev ? { ...prev, theme } : null));
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    const { signOutWithSupabase } = await import('./authActions');
    await signOutWithSupabase();
    clearSession();
    router.refresh();
  }, [clearSession, router]);

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const actions = await import('./authActions');
    return actions.signInWithGoogle(redirectTo);
  }, []);

  const signInWithDiscord = useCallback(async (redirectTo?: string) => {
    const actions = await import('./authActions');
    return actions.signInWithDiscord(redirectTo);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const actions = await import('./authActions');
    return actions.signInWithEmail(email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, bypassToken?: string) => {
    const actions = await import('./authActions');
    return actions.signUpWithEmail(email, password, bypassToken);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const actions = await import('./authActions');
    return actions.resetPassword(email);
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const actions = await import('./authActions');
    return actions.updatePassword(newPassword);
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
