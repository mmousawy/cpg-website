'use client';

import { Toaster } from 'sonner';

export default function ToastProvider() {
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
      className="toast-container"
    />
  );
}
