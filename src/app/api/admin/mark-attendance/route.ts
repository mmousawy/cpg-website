import { NextRequest, NextResponse } from 'next/server';
import { revalidateEventAttendees } from '@/app/actions/revalidate';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
  }

  const { rsvp_id, unmark, action = 'attended' } = await request.json();

  if (!rsvp_id) {
    return NextResponse.json({ message: 'Missing rsvp_id' }, { status: 400 });
  }

  const now = new Date().toISOString();
  let updateData: Record<string, string | null>;

  if (action === 'no_show') {
    updateData = unmark
      ? { no_show_at: null }
      : { no_show_at: now, attended_at: null };
  } else {
    updateData = unmark
      ? { attended_at: null }
      : { attended_at: now, no_show_at: null };
  }

  const { error } = await supabase
    .from('events_rsvps')
    .update(updateData)
    .eq('id', rsvp_id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  // Revalidate attendee cache so attendance status is reflected
  await revalidateEventAttendees();

  return NextResponse.json({ success: true }, { status: 200 });
}
