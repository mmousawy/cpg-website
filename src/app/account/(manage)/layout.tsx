import { ManageDataProvider } from '@/context/ManageDataContext';
import { unstable_noStore } from 'next/cache';

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Opt out of static generation - manage routes require authentication
  unstable_noStore();

  return <ManageDataProvider>{children}</ManageDataProvider>;
}
