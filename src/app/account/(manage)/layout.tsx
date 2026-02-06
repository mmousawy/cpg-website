import { ManageDataProvider } from '@/context/ManageDataContext';
import { connection } from 'next/server';

export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Opt out of static generation - manage routes require authentication
  await connection();

  return <ManageDataProvider>
    {children}
  </ManageDataProvider>;
}
