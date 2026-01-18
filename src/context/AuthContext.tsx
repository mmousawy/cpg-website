'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase/client';
import { Database } from '@/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
  signInWithDiscord: (redirectTo?: string) => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentUserIdRef = useRef<string | null>(null);
  const fetchingProfileRef = useRef<string | null>(null);
  const lastLoggedInUpdatedRef = useRef<string | null>(null);

  const isAdmin = useMemo(() => !!profile?.is_admin, [profile]);

  const fetchProfile = useCallback(async (userId: string, force = false) => {
    if (!force && fetchingProfileRef.current === userId) return null;

    fetchingProfileRef.current = userId;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      setProfile(error ? null : data);
      return data;
    } catch {
      setProfile(null);
      return null;
    } finally {
      if (fetchingProfileRef.current === userId) {
        fetchingProfileRef.current = null;
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (currentUserIdRef.current) {
      await fetchProfile(currentUserIdRef.current, true);
    }
  }, [fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const updateLastLoggedIn = (userId: string): void => {
      if (lastLoggedInUpdatedRef.current === userId) return;
      lastLoggedInUpdatedRef.current = userId;
      // Fire and forget - don't block auth flow if this fails
      supabase.from('profiles').update({ last_logged_in: new Date().toISOString() }).eq('id', userId).then(() => {});
    };

    // Initialize session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      const userId = session?.user?.id ?? null;
      setUser(session?.user ?? null);
      setSession(session);
      currentUserIdRef.current = userId;
      setIsLoading(false);

      if (userId) {
        updateLastLoggedIn(userId);
        fetchProfile(userId);
      }
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted || event === 'INITIAL_SESSION') return;

      const userId = session?.user?.id ?? null;
      const userChanged = userId !== currentUserIdRef.current;

      setUser(session?.user ?? null);
      setSession(session);
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
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth-callback${redirectTo ? `?redirectTo=${redirectTo}` : ''}` },
    });
    return { error };
  }, []);

  const signInWithDiscord = useCallback(async (redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}/auth-callback${redirectTo ? `?redirectTo=${redirectTo}` : ''}` },
    });
    return { error };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
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
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error || null };
  }, []);

  const value = useMemo(() => ({
    user, session, profile, isLoading, isAdmin, refreshProfile,
    signOut, signInWithGoogle, signInWithDiscord, signInWithEmail,
    signUpWithEmail, resetPassword, updatePassword,
  }), [user, session, profile, isLoading, isAdmin, refreshProfile, signOut,
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
