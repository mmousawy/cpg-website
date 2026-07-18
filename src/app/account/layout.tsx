import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { createNoIndexMetadata } from '@/utils/metadata';
import { isProfileComplete } from '@/utils/profileCompletion';
import { getServerAuth } from '@/utils/supabase/getServerAuth';

export const metadata = createNoIndexMetadata({
  title: 'Account',
  description: 'Manage your Creative Photography Group account settings',
});

async function AccountConnection() {
  // Opt out of static generation - account pages require authentication
  await connection();
  return null;
}

async function AccountAuthGuard() {
  const { user, profile } = await getServerAuth();

  // Redirect to login if not authenticated (proxy middleware also enforces this)
  if (!user) {
    redirect('/login?redirectTo=/account');
  }

  // Note: deletion_scheduled_at check is handled in the proxy (middleware)
  // which signs the user out and redirects to /account-deleted

  // Redirect to onboarding until required profile fields are completed
  if (!isProfileComplete(profile, { fallbackEmail: user.email ?? null })) {
    redirect('/onboarding');
  }

  return null;
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Suspense
        fallback={null}
      >
        <AccountConnection />
      </Suspense>
      <Suspense
        fallback={null}
      >
        <AccountAuthGuard />
      </Suspense>
      {children}
    </>
  );
}
