import { createClient } from '@/utils/supabase/server';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { pathname } = await request.json();

    if (typeof pathname !== 'string' || pathname.length === 0) {
      return NextResponse.json({ success: false, markedIds: [], error: 'Invalid pathname' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, markedIds: [], error: 'Not authenticated' }, { status: 401 });
    }

    const { data: matchingNotifications, error: fetchError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .is('seen_at', null)
      .is('dismissed_at', null)
      .filter('data->>link', 'eq', pathname);

    if (fetchError) {
      console.error('Error fetching notifications by link:', fetchError);
      return NextResponse.json({ success: false, markedIds: [], error: fetchError.message }, { status: 500 });
    }

    if (!matchingNotifications || matchingNotifications.length === 0) {
      return NextResponse.json({ success: true, markedIds: [] });
    }

    const ids = matchingNotifications.map((n) => n.id);

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ seen_at: new Date().toISOString() })
      .in('id', ids);

    if (updateError) {
      console.error('Error marking notifications as seen by link:', updateError);
      return NextResponse.json({ success: false, markedIds: [], error: updateError.message }, { status: 500 });
    }

    revalidateTag(`notifications-${user.id}`, 'max');

    return NextResponse.json({ success: true, markedIds: ids });
  } catch (error) {
    console.error('Error in mark-seen-by-link API:', error);
    return NextResponse.json({ success: false, markedIds: [], error: 'Internal server error' }, { status: 500 });
  }
}
