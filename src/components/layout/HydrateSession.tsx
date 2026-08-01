'use client';

import { useLayoutEffect, useRef } from 'react';

import { useSession } from '@/context/SessionContext';
import type { ServerAuth } from '@/utils/supabase/getServerAuth';

type HydrateSessionProps = {
  auth: ServerAuth;
};

export default function HydrateSession({ auth }: HydrateSessionProps) {
  const { setSession, markSessionReady } = useSession();
  const hydratedRef = useRef(false);

  useLayoutEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (auth.user) {
      setSession(auth);
    }
    markSessionReady();
  }, [auth, setSession, markSessionReady]);

  return null;
}
