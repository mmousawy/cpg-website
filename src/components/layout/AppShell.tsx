import type { ReactNode } from 'react';
import { Suspense } from 'react';

import ConfirmProvider from '@/app/providers/ConfirmProvider';
import ModalProvider from '@/app/providers/ModalProvider';
import LazyOverlays from '@/components/layout/LazyOverlays';
import Layout from '@/components/layout/Layout';
import DeferredNotificationToastManager from '@/components/notifications/DeferredNotificationToastManager';

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <ConfirmProvider>
      <ModalProvider>
        <Layout>
          {children}
        </Layout>
        <LazyOverlays />
        <Suspense
          fallback={null}
        >
          <DeferredNotificationToastManager />
        </Suspense>
      </ModalProvider>
    </ConfirmProvider>
  );
}
