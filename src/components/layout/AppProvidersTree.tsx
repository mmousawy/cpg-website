import AppProviders from '@/components/layout/AppProviders';
import AppShell from '@/components/layout/AppShell';
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
    </SessionProvider>
  );
}
