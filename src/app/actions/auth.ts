'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getOnboardingCookieOptions, ONBOARDING_COOKIE_NAME } from '@/utils/onboardingCookie';
import { createClient } from '@/utils/supabase/server';
import { safeInternalPath } from '@/utils/security';

export async function signOutAction(formData: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.set(ONBOARDING_COOKIE_NAME, '', {
    ...getOnboardingCookieOptions(),
    maxAge: 0,
  });

  const redirectTo = formData.get('redirectTo') as string | null;
  redirect(safeInternalPath(redirectTo, '/'));
}
