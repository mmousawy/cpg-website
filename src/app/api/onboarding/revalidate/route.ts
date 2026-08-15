import { NextResponse } from 'next/server';

import { expireMemberListCaches } from '@/lib/cache/expireTag';
import { isProfileComplete } from '@/utils/profileCompletion';
import { adminSupabase } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

/** POST — expire homepage/members caches after onboarding completes. */
export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('nickname, email, full_name, terms_accepted_at')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (!isProfileComplete(profile, { fallbackEmail: user.email ?? null })) {
    return NextResponse.json({ error: 'Profile is not complete' }, { status: 400 });
  }

  expireMemberListCaches(profile.nickname);

  return NextResponse.json({ success: true });
}
