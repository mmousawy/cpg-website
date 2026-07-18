import { connection } from 'next/server';
import { Suspense } from 'react';

import { ManageDataProvider } from '@/context/ManageDataContext';

async function ManageConnection() {
  // Opt out of static generation - manage routes require authentication
  await connection();
  return null;
}

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense
        fallback={null}
      >
        <ManageConnection />
      </Suspense>
      <ManageDataProvider>
        {children}
      </ManageDataProvider>
    </>
  );
}
