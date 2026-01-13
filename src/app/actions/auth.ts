'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function signOutAction(formData: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Get the redirect path from form data, default to home
  const redirectTo = formData.get('redirectTo') as string | null;

  // Protected routes should redirect to home after sign out
  if (redirectTo?.startsWith('/account') || redirectTo?.startsWith('/admin')) {
    redirect('/');
  }

  // For public pages, redirect back to the same page (forces refresh)
  redirect(redirectTo || '/');
}
