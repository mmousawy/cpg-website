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
    
    if (typeof window !== 'undefined') {
      console.log('[AuthContext] setting up auth listener');
    }
    
    // Use onAuthStateChange as the single source of truth
    // This handles: initial session, sign in, sign out, token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (typeof window !== 'undefined') {
        console.log('[AuthContext] onAuthStateChange', { event, hasSession: !!session, userId: session?.user?.id });
      }
      
      setUser(session?.user ?? null);
      setSession(session);
      setIsLoading(false);
      
      // Update last_logged_in on sign in (fire and forget, don't block)
      if (session?.user && event === 'SIGNED_IN') {
        supabase
          .from('profiles')
          .update({ last_logged_in: new Date().toISOString() })
          .eq('id', session.user.id)
          .then(() => {
            if (typeof window !== 'undefined') {
              console.log('[AuthContext] updated last_logged_in');
            }
          })
          .catch(() => {
            // Silently ignore - not critical
          });
      }
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch isAdmin when user changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[AuthContext] profile fetch effect running', { user: user?.id || null });
    }
    if (!user) {
      if (typeof window !== 'undefined') {
        console.log('[AuthContext] profile fetch: user is null, skipping');
      }
      setIsAdmin(false);
      return;
    }
    
    const abortController = new AbortController();
    const supabase = createClient();
    
    const fetchAdmin = async () => {
      if (typeof window !== 'undefined') {
        console.log('[AuthContext] fetchAdmin about to query', { userId: user.id });
      }
      
      try {
        // Timeout after 10s
        const timeoutId = setTimeout(() => abortController.abort(), 10000);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .abortSignal(abortController.signal)
          .single();
        
        clearTimeout(timeoutId);
        
        // Check if aborted (Supabase returns abort as error, not exception)
        if (error?.message?.includes('AbortError') || error?.message?.includes('aborted')) {
          if (typeof window !== 'undefined') {
            console.log('[AuthContext] fetchAdmin aborted (cleanup or timeout)');
          }
          return;
        }
        
        if (typeof window !== 'undefined') {
          console.log('[AuthContext] fetchAdmin result', { userId: user.id, isAdmin: data?.is_admin, error: error?.message || null });
        }
        
        if (error) {
          console.error('[AuthContext] fetchAdmin error:', error.message);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data?.is_admin);
        }
      } catch (err) {
        // Handle thrown AbortError (some versions of Supabase throw instead of return)
        if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'))) {
          if (typeof window !== 'undefined') {
            console.log('[AuthContext] fetchAdmin aborted (cleanup or timeout)');
          }
          return;
        }
        if (typeof window !== 'undefined') {
          console.error('[AuthContext] fetchAdmin unexpected error:', err);
        }
        setIsAdmin(false);
      }
    };
    
    fetchAdmin();
    
    return () => {
      abortController.abort();
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
