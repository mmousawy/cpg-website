"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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
  
  // Track current user ID to avoid refetching on token refresh
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let authStateReceived = false;
    const supabase = createClient();
    
    console.log('[Auth] Initializing...');
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      authStateReceived = true;
      
      const userId = session?.user?.id ?? null;
      const userChanged = userId !== currentUserIdRef.current;
      
      console.log('[Auth]', event, { userId, userChanged });
      
      // Update state immediately - don't wait for profile fetch
      setUser(session?.user ?? null);
      setSession(session);
      currentUserIdRef.current = userId;
      
      // Auth is ready - stop loading immediately
      // This allows the page to render while admin check happens in background
      setIsLoading(false);
      
      // Handle user change (sign in, sign out, or different user)
      if (userChanged) {
        if (!userId) {
          // User signed out
          setIsAdmin(false);
          return;
        }
        
        // Fetch admin status in background - no timeout needed, no blocking
        console.log('[Auth] Fetching admin status...');
        supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', userId)
          .single()
          .then(({ data, error }) => {
            if (!mounted) return;
            if (error) {
              console.log('[Auth] Admin check error:', error.message);
              setIsAdmin(false);
            } else {
              console.log('[Auth] Admin status:', data?.is_admin);
              setIsAdmin(!!data?.is_admin);
            }
          });
        
        // Update last_logged_in on actual sign in (fire and forget)
        if (event === 'SIGNED_IN') {
          supabase
            .from('profiles')
            .update({ last_logged_in: new Date().toISOString() })
            .eq('id', userId)
            .then(() => console.log('[Auth] Updated last_logged_in'));
        }
      }
    });
    
    // Fallback: If onAuthStateChange doesn't fire within 3 seconds, manually get session
    const fallbackTimeout = setTimeout(async () => {
      if (!authStateReceived && mounted) {
        console.log('[Auth] Fallback: onAuthStateChange did not fire, calling getSession()');
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (mounted && !authStateReceived) {
            console.log('[Auth] Fallback session:', session?.user?.id ?? 'none');
            setUser(session?.user ?? null);
            setSession(session);
            currentUserIdRef.current = session?.user?.id ?? null;
            setIsLoading(false);
          }
        } catch (err) {
          console.error('[Auth] Fallback error:', err);
          if (mounted) {
            setIsLoading(false);
          }
        }
      }
    }, 3000);
    
    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);

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
