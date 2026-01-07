import { redirect } from 'next/navigation';
import { getServerAuth } from '@/utils/supabase/getServerAuth';

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await getServerAuth();

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login?redirectTo=/account');
  }

  // Redirect to onboarding if no nickname set
  if (profile && !profile.nickname) {
    redirect('/onboarding');
  }

  return <>{children}</>;
}
