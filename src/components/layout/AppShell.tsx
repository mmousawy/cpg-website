'use client';

import { Suspense } from 'react';

import ConfirmProvider from '@/app/providers/ConfirmProvider';
import ModalProvider from '@/app/providers/ModalProvider';
import LazyOverlays from '@/components/layout/LazyOverlays';
import Layout from '@/components/layout/Layout';
import DeferredNotificationToastManager from '@/components/notifications/DeferredNotificationToastManager';

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <ConfirmProvider>
      <ModalProvider>
        <Suspense
          fallback={null}
        >
          <Layout>
            {children}
          </Layout>
        </Suspense>
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
