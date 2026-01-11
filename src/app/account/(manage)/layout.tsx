'use client';

import { ManageProvider } from '@/context/ManageContext';

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ManageProvider>{children}</ManageProvider>;
}
