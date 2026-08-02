'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { safeInternalPath } from '@/utils/security';

export async function signOutAction(formData: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const redirectTo = formData.get('redirectTo') as string | null;
  redirect(safeInternalPath(redirectTo, '/'));
}
