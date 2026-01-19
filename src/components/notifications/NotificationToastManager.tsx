'use client';

import dynamic from 'next/dynamic';
import ToastProvider from './ToastProvider';

// Dynamically import the hooks wrapper to avoid SSR issues with Supabase Realtime
const NotificationHooks = dynamic(
  () => import('./NotificationHooks'),
  { ssr: false },
);

export default function NotificationToastManager() {
  return (
    <>
      <NotificationHooks />
      <ToastProvider />
    </>
  );
}
