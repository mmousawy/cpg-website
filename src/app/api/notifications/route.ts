import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { NotificationWithActor } from '@/types/notifications';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Get unseen count (only non-dismissed)
  const { count: unseenCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('seen_at', null)
    .is('dismissed_at', null);

  // Get total count of active notifications (for "more" indicator)
  const { count: totalCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('dismissed_at', null);

  // Get notifications with pagination (only non-dismissed)
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!notifications_actor_id_fkey(nickname, avatar_url, full_name)
    `)
    .eq('user_id', user.id)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }

  const notifications = (data || []).map((notification) => ({
    ...notification,
    actor: notification.actor || null,
  })) as NotificationWithActor[];

  const total = totalCount ?? 0;
  const hasMore = offset + notifications.length < total;

  return NextResponse.json({
    notifications,
    unseenCount: unseenCount ?? 0,
    totalCount: total,
    hasMore,
  });
}
