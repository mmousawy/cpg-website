'use client';

import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';

// Paths where the header is full-width (must match Header.tsx)
const fullWidthPaths = ['/account/photos', '/account/albums'];

export default function ToastProvider() {
  const pathname = usePathname();

  // Check if current path has full-width header
  const isFullWidth = fullWidthPaths.some((path) => pathname.startsWith(path));

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 10000, // 10 seconds
        style: {
          background: 'var(--background-light)',
          border: '1px solid var(--border-color)',
          color: 'var(--foreground)',
          borderRadius: '0.75rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        className: 'notification-toast',
      }}
      className={clsx('toast-container', isFullWidth && 'toast-container--full-width')}
    />
  );
}
