import { Suspense } from 'react';

import AppProviders from '@/components/layout/AppProviders';
import AppShell from '@/components/layout/AppShell';
import SessionFromServer from '@/components/layout/SessionFromServer';
import { SessionProvider } from '@/context/SessionContext';
import type { ServerAuth } from '@/utils/supabase/getServerAuth';

const emptyAuth: ServerAuth = { user: null, profile: null };

type AppProvidersTreeProps = {
  children: React.ReactNode;
};

export default function AppProvidersTree({ children }: AppProvidersTreeProps) {
  return (
    <SessionProvider
      initial={emptyAuth}
    >
      <AppProviders>
        <AppShell>
          {children}
        </AppShell>
      </AppProviders>
      <Suspense
        fallback={null}
      >
        <SessionFromServer />
      </Suspense>
    </SessionProvider>
  );
}
