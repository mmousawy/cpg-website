import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getServerAuth } from '@/utils/supabase/getServerAuth';
import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Account',
  description: 'Manage your Creative Photography Group account settings',
});

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Opt out of static generation - account pages require authentication
  await connection();

  const { user, profile } = await getServerAuth();

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login?redirectTo=/account');
  }

  // Redirect to onboarding if no nickname set
  if (profile && !profile.nickname) {
    redirect('/onboarding');
  }

  return <>
    {children}
  </>;
}
