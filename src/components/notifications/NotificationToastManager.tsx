'use client';

import { useMounted } from '@/hooks/useMounted';

import NotificationHooks from './NotificationHooks';
import ToastProvider from './ToastProvider';

export default function NotificationToastManager() {
  const mounted = useMounted();

  return (
    <>
      {mounted ? <NotificationHooks /> : null}
      <ToastProvider />
    </>
  );
}
