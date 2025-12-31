"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

export type AuthState = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: any }>;
  signInWithDiscord: (redirectTo?: string) => Promise<{ error: any }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, password: string, metadata?: { full_name?: string; nickname?: string }) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (typeof window !== 'undefined') {
          console.log('[AuthContext] getSession', { session, error });
        }
        if (error) {
          setUser(null);
          setSession(null);
          setIsAdmin(false);
          setIsLoading(false);
          if (typeof window !== 'undefined') {
            console.error('[AuthContext] getSession error', error);
          }
          return;
        }
        if (session) {
          const expiresAt = session.expires_at || 0;
          const now = Math.floor(Date.now() / 1000);
          const shouldRefresh = expiresAt - now < 60;
          if (typeof window !== 'undefined') {
            console.log('[AuthContext] session found', { session, expiresAt, now, shouldRefresh });
          }
          if (shouldRefresh) {
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
            if (!mounted) return;
            if (typeof window !== 'undefined') {
              console.log('[AuthContext] refreshSession', { refreshedSession, refreshError });
            }
            if (refreshError) {
              setUser(null);
              setSession(null);
              setIsAdmin(false);
              if (typeof window !== 'undefined') {
                console.error('[AuthContext] refreshSession error', refreshError);
              }
            } else {
              setUser(refreshedSession?.user ?? session.user ?? null);
              setSession(refreshedSession ?? session);
            }
            setIsLoading(false);
          } else {
            setUser(session.user);
            setSession(session);
            setIsLoading(false);
          }
        } else {
          setUser(null);
          setSession(null);
          setIsAdmin(false);
          setIsLoading(false);
          if (typeof window !== 'undefined') {
            console.warn('[AuthContext] No session found');
          }
        }
      } catch (err) {
        if (!mounted) return;
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        setIsLoading(false);
        if (typeof window !== 'undefined') {
          console.error('[AuthContext] Unexpected error initializing auth', err);
        }
      }
    };
    initializeAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (typeof window !== 'undefined') {
        console.log('[AuthContext] onAuthStateChange', { _event, session });
      }
      setUser(session?.user ?? null);
      setSession(session);
      setIsLoading(false);
      if (session?.user && _event === 'SIGNED_IN') {
        try {
          await supabase.from('profiles').update({ last_logged_in: new Date().toISOString() }).eq('id', session.user.id);
        } catch {}
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch isAdmin when user changes
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    const fetchAdmin = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      if (!cancelled) {
        setIsAdmin(!!data?.is_admin);
      }
    };
    fetchAdmin();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  }, []);

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth-callback${redirectTo ? `?redirectTo=${redirectTo}` : ''}` },
    });
    return { error };
  }, []);

  const signInWithDiscord = useCallback(async (redirectTo?: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}/auth-callback${redirectTo ? `?redirectTo=${redirectTo}` : ''}` },
    });
    return { error };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, metadata?: { full_name?: string; nickname?: string }) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth-callback`,
        data: metadata,
      },
    });
    return { error };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAdmin, signOut, signInWithGoogle, signInWithDiscord, signInWithEmail, signUpWithEmail, resetPassword, updatePassword }}>
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
