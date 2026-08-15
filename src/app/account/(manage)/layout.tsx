import { connection } from 'next/server';
import { Suspense } from 'react';

import { ManageDataProvider } from '@/context/ManageDataContext';
import { UnsavedChangesProvider } from '@/context/UnsavedChangesContext';

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
      <div
        className="manage-page"
        hidden
        aria-hidden
      />
      <Suspense
        fallback={null}
      >
        <ManageConnection />
      </Suspense>
      <ManageDataProvider>
        <UnsavedChangesProvider>
          {children}
        </UnsavedChangesProvider>
      </ManageDataProvider>
    </>
  );
}
