import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { NotificationWithActor } from '@/types/notifications';

type NotificationUpdate = {
  id: string;
  action: 'mark_seen' | 'dismiss';
};

type BatchUpdateRequest = {
  updates: NotificationUpdate[];
};

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

/**
 * Batch update notifications (mark as seen or dismiss)
 * Accepts an array of updates and processes them in a single transaction
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: BatchUpdateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { updates } = body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  // Validate updates
  const validUpdates = updates.filter(
    (u): u is NotificationUpdate =>
      typeof u.id === 'string' &&
      (u.action === 'mark_seen' || u.action === 'dismiss'),
  );

  if (validUpdates.length === 0) {
    return NextResponse.json({ error: 'No valid updates' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Separate updates by action type for batch processing
  const markSeenIds = validUpdates
    .filter((u) => u.action === 'mark_seen')
    .map((u) => u.id);

  const dismissIds = validUpdates
    .filter((u) => u.action === 'dismiss')
    .map((u) => u.id);

  const errors: string[] = [];

  // Batch mark as seen
  if (markSeenIds.length > 0) {
    const { error } = await supabase
      .from('notifications')
      .update({ seen_at: now })
      .in('id', markSeenIds)
      .eq('user_id', user.id)
      .is('seen_at', null); // Only update if not already seen

    if (error) {
      console.error('Error marking notifications as seen:', error);
      errors.push(`mark_seen: ${error.message}`);
    }
  }

  // Batch dismiss (also marks as seen)
  if (dismissIds.length > 0) {
    const { error } = await supabase
      .from('notifications')
      .update({ dismissed_at: now, seen_at: now })
      .in('id', dismissIds)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error dismissing notifications:', error);
      errors.push(`dismiss: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { success: false, errors },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    processed: {
      marked_seen: markSeenIds.length,
      dismissed: dismissIds.length,
    },
  });
}
