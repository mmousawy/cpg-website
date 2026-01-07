'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/database.types';

async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

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
