import { NextRequest, NextResponse } from 'next/server';
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

  const { rsvp_id, unmark } = await request.json();

  if (!rsvp_id) {
    return NextResponse.json({ message: 'Missing rsvp_id' }, { status: 400 });
  }

  // Mark or unmark attendance
  const { error } = await supabase
    .from('events_rsvps')
    .update({ attended_at: unmark ? null : new Date().toISOString() })
    .eq('id', rsvp_id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
