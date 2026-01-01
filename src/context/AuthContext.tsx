"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Track current user ID to avoid refetching on token refresh
  const currentUserIdRef = useRef<string | null>(null);
  
  // Derive isAdmin from profile
  const isAdmin = useMemo(() => !!profile?.is_admin, [profile]);

  // Function to fetch/refresh profile - can be called after profile updates
  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient();
    console.log('[Auth] Fetching profile...');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.log('[Auth] Profile fetch error:', error.message);
      setProfile(null);
    } else {
      console.log('[Auth] Profile loaded:', { nickname: data?.nickname, isAdmin: data?.is_admin });
      setProfile(data);
    }
    
    return data;
  }, []);

  // Public method to refresh profile (e.g., after user edits their profile)
  const refreshProfile = useCallback(async () => {
    if (currentUserIdRef.current) {
      await fetchProfile(currentUserIdRef.current);
    }
  }, [fetchProfile]);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    
    console.log('[Auth] Initializing...');
    
    // Helper to handle session updates
    const handleSession = async (session: Session | null, event: string) => {
      if (!mounted) return;
      
      const userId = session?.user?.id ?? null;
      const userChanged = userId !== currentUserIdRef.current;
      
      console.log('[Auth]', event, { userId, userChanged });
      
      // Update auth state immediately
      setUser(session?.user ?? null);
      setSession(session);
      currentUserIdRef.current = userId;
      
      // Handle user change (sign in, sign out, or different user)
      if (userChanged) {
        if (!userId) {
          // User signed out - clear profile
          setProfile(null);
        } else {
          // Fetch full profile (includes is_admin, nickname, avatar, etc.)
          await fetchProfile(userId);
          
          // Update last_logged_in on actual sign in (fire and forget)
          if (event === 'SIGNED_IN') {
            supabase
              .from('profiles')
              .update({ last_logged_in: new Date().toISOString() })
              .eq('id', userId)
              .then(() => console.log('[Auth] Updated last_logged_in'));
          }
        }
      }
      
      if (mounted) {
        setIsLoading(false);
      }
    };
    
    // Get initial session immediately (don't wait for onAuthStateChange)
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[Auth] Initial getSession:', session?.user?.id ?? 'none');
        await handleSession(session, 'INITIAL_GET_SESSION');
      } catch (err) {
        console.error('[Auth] getSession error:', err);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    initSession();
    
    // Set up auth state change listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip INITIAL_SESSION since we already handled it with getSession()
      if (event === 'INITIAL_SESSION') {
        console.log('[Auth] Skipping INITIAL_SESSION (already handled)');
        return;
      }
      await handleSession(session, event);
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

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
    <AuthContext.Provider value={{ user, session, profile, isLoading, isAdmin, refreshProfile, signOut, signInWithGoogle, signInWithDiscord, signInWithEmail, signUpWithEmail, resetPassword, updatePassword }}>
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
