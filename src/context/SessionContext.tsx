'use client';

import type { User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { ServerAuth, ServerProfile } from '@/utils/supabase/getServerAuth';

export type SessionState = {
  user: User | null;
  profile: ServerProfile | null;
  isAdmin: boolean;
  isLoggedIn: boolean;
  /** False until client session has been resolved from the server. */
  isSessionReady: boolean;
  setSession: (auth: ServerAuth) => void;
  clearSession: () => void;
  markSessionReady: () => void;
};

const SessionContext = createContext<SessionState | undefined>(undefined);

type SessionProviderProps = {
  initial: ServerAuth;
  children: ReactNode;
};

export function SessionProvider({ initial, children }: SessionProviderProps) {
  const [user, setUser] = useState<User | null>(initial.user);
  const [profile, setProfile] = useState<ServerProfile | null>(initial.profile);
  const [isSessionReady, setIsSessionReady] = useState(false);

  const setSession = useCallback((auth: ServerAuth) => {
    setUser(auth.user);
    setProfile(auth.profile);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setProfile(null);
  }, []);

  const markSessionReady = useCallback(() => {
    setIsSessionReady(true);
  }, []);

  const value = useMemo<SessionState>(() => ({
    user,
    profile,
    isAdmin: !!profile?.is_admin,
    isLoggedIn: !!user,
    isSessionReady,
    setSession,
    clearSession,
    markSessionReady,
  }), [user, profile, isSessionReady, setSession, clearSession, markSessionReady]);

  return (
    <SessionContext.Provider
      value={value}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
