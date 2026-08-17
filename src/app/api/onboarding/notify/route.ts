import { NextResponse } from 'next/server';

import { expireMemberListCaches } from '@/lib/cache/expireTag';
import { shouldSkipNotificationsAndEmails } from '@/lib/auth/isTestEmail';
import { notifyAdminsOfMemberJoined } from '@/lib/notifications/notifyAdminsOfMemberJoined';
import { isProfileComplete } from '@/utils/profileCompletion';
import { createClient } from '@/utils/supabase/server';
import { adminSupabase } from '@/utils/supabase/admin';

/** POST — notify admins that the current user finished onboarding. */
export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('id, email, full_name, nickname, terms_accepted_at')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (!isProfileComplete(profile, { fallbackEmail: user.email ?? null })) {
    return NextResponse.json({ error: 'Profile is not complete' }, { status: 400 });
  }

  expireMemberListCaches(profile.nickname);

  if (shouldSkipNotificationsAndEmails(profile.email ?? user.email)) {
    return NextResponse.json({ success: true, skipped: true });
  }

  const { data: existing } = await adminSupabase
    .from('notifications')
    .select('id')
    .eq('type', 'member_joined')
    .eq('actor_id', user.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: true, alreadyNotified: true });
  }

  try {
    await notifyAdminsOfMemberJoined(user.id);
  } catch (error) {
    console.error('Error notifying admins of new member:', error);
    return NextResponse.json({ error: 'Failed to notify admins' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
