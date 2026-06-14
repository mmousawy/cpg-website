import { NextRequest, NextResponse } from 'next/server';
import { revalidateEventAttendees } from '@/app/actions/revalidate';
import type { TablesInsert } from '@/database.types';
import { createClient } from '@/utils/supabase/server';

async function getAdminUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return null;

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

  // Fetch the member's profile to populate name/email on the RSVP
  const { data: profile, error: profileError } = await supabase
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

  await revalidateEventAttendees();

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

  const { error } = await supabase
    .from('events_rsvps')
    .update({ canceled_at: new Date().toISOString() })
    .eq('id', rsvp_id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  await revalidateEventAttendees();

  return NextResponse.json({ success: true }, { status: 200 });
}
