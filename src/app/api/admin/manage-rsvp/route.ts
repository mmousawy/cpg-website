import { NextRequest, NextResponse } from 'next/server';
import { revalidateEventAttendees } from '@/app/actions/revalidate';
import type { TablesInsert } from '@/database.types';
import { checkIsAdmin } from '@/lib/auth/checkIsAdmin';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

async function getAdminUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) return null;

  return user;
}

/** POST — add a member to an event RSVP */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const adminUser = await getAdminUser(supabase);

  if (!adminUser) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { event_id, user_id } = body;

  if (!event_id || !user_id) {
    return NextResponse.json({ message: 'Missing event_id or user_id' }, { status: 400 });
  }

  // email is not granted to authenticated — use service role after admin check
  const adminSupabase = createAdminClient();
  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user_id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ message: 'Member not found' }, { status: 404 });
  }

  // Check for an existing active (non-canceled) RSVP for this user + event
  const { data: existing } = await supabase
    .from('events_rsvps')
    .select('id, canceled_at')
    .eq('event_id', event_id)
    .eq('user_id', user_id)
    .maybeSingle();

  if (existing && !existing.canceled_at) {
    return NextResponse.json({ message: 'Member already has an active RSVP for this event' }, { status: 409 });
  }

  // If a canceled RSVP exists, reinstate it; otherwise insert a new one
  const now = new Date().toISOString();

  if (existing?.canceled_at) {
    const { error } = await supabase
      .from('events_rsvps')
      .update({ canceled_at: null, confirmed_at: now })
      .eq('id', existing.id);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
  } else {
    const insertData = {
      event_id,
      user_id,
      name: profile.full_name,
      email: profile.email,
      confirmed_at: now,
    } satisfies TablesInsert<'events_rsvps'>;

    const { error } = await supabase
      .from('events_rsvps')
      .insert(insertData);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
  }

  const { data: event } = await supabase
    .from('events')
    .select('slug')
    .eq('id', event_id)
    .maybeSingle();

  await revalidateEventAttendees(event?.slug);

  return NextResponse.json({ success: true }, { status: 200 });
}

/** DELETE — remove a member from an event RSVP (soft-delete via canceled_at) */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const adminUser = await getAdminUser(supabase);

  if (!adminUser) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { rsvp_id } = body;

  if (!rsvp_id) {
    return NextResponse.json({ message: 'Missing rsvp_id' }, { status: 400 });
  }

  const { data: canceledRsvp, error } = await supabase
    .from('events_rsvps')
    .update({ canceled_at: new Date().toISOString() })
    .eq('id', rsvp_id)
    .select('events(slug)')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const canceledEvent = canceledRsvp?.events as { slug?: string | null } | { slug?: string | null }[] | null;
  const canceledSlug = Array.isArray(canceledEvent) ? canceledEvent[0]?.slug : canceledEvent?.slug;

  await revalidateEventAttendees(canceledSlug);

  return NextResponse.json({ success: true }, { status: 200 });
}
