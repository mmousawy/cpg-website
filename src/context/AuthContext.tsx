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

  // Function to fetch/refresh profile - runs in background, never blocks
  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient();
    console.log('[Auth] Fetching profile...');
    
    try {
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
    } catch (err) {
      console.error('[Auth] Profile fetch exception:', err);
      setProfile(null);
      return null;
    }
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
    
    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id ?? null;
        
        console.log('[Auth] Initial session:', userId ?? 'none');
        
        if (mounted) {
          setUser(session?.user ?? null);
          setSession(session);
          currentUserIdRef.current = userId;
          
          // IMPORTANT: Set loading false IMMEDIATELY - don't wait for profile
          setIsLoading(false);
          console.log('[Auth] Ready (isLoading=false)');
          
          // Fetch profile in background (non-blocking)
          if (userId) {
            fetchProfile(userId);
            
            // Update last_logged_in (fire and forget)
            supabase
              .from('profiles')
              .update({ last_logged_in: new Date().toISOString() })
              .eq('id', userId)
              .then(() => console.log('[Auth] Updated last_logged_in'));
          }
        }
      } catch (err) {
        console.error('[Auth] getSession error:', err);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    initSession();
    
    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // Skip INITIAL_SESSION - we already handled it above
      if (event === 'INITIAL_SESSION') {
        return;
      }
      
      const userId = session?.user?.id ?? null;
      const userChanged = userId !== currentUserIdRef.current;
      
      console.log('[Auth]', event, { userId, userChanged });
      
      // Update auth state
      setUser(session?.user ?? null);
      setSession(session);
      currentUserIdRef.current = userId;
      
      // Only fetch profile if user changed
      if (userChanged) {
        if (userId) {
          // Fetch profile in background (non-blocking)
          fetchProfile(userId);
          
          if (event === 'SIGNED_IN') {
            supabase
              .from('profiles')
              .update({ last_logged_in: new Date().toISOString() })
              .eq('id', userId)
              .then(() => console.log('[Auth] Updated last_logged_in'));
          }
        } else {
          // Signed out - clear profile
          setProfile(null);
        }
      }
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
