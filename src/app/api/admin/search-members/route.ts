import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/** GET — search members by name/nickname/email, excluding those already RSVP'd to an event */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q')?.trim() ?? '';
  const eventId = searchParams.get('event_id');

  if (!q) {
    return NextResponse.json({ members: [] });
  }

  // Fetch members matching the search query
  let query = supabase
    .from('profiles')
    .select('id, full_name, nickname, email, avatar_url')
    .or(`email.ilike.%${q}%,full_name.ilike.%${q}%,nickname.ilike.%${q}%`)
    .is('suspended_at', null)
    .order('full_name', { ascending: true })
    .limit(20);

  const { data: members, error } = await query;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  // If an event_id is provided, exclude members who already have an active RSVP
  if (eventId) {
    const { data: existingRsvps } = await supabase
      .from('events_rsvps')
      .select('user_id')
      .eq('event_id', parseInt(eventId))
      .not('user_id', 'is', null)
      .is('canceled_at', null);

    const rsvpUserIds = new Set((existingRsvps ?? []).map((r) => r.user_id));
    const filtered = (members ?? []).filter((m) => !rsvpUserIds.has(m.id));

    return NextResponse.json({ members: filtered });
  }

  return NextResponse.json({ members: members ?? [] });
}
