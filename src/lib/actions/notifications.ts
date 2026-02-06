'use server';

import { createNotification } from '@/lib/notifications/create';
import type { NotificationType } from '@/types/notifications';
import { createClient } from '@/utils/supabase/server';
import { revalidateTag } from 'next/cache';

/**
 * Mark a notification as seen
 */
export async function markNotificationAsSeen(notificationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ seen_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error marking notification as seen:', error);
    return { success: false, error: error.message };
  }

  revalidateTag(`notifications-${user.id}`, 'max');
  return { success: true };
}

/**
 * Mark all notifications as seen for the current user
 */
export async function markAllNotificationsAsSeen(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ seen_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('seen_at', null);

  if (error) {
    console.error('Error marking all notifications as seen:', error);
    return { success: false, error: error.message };
  }

  revalidateTag(`notifications-${user.id}`, 'max');
  return { success: true };
}

/**
 * Mark notifications as seen by matching link/pathname
 * Used for auto-marking when user visits a page associated with notifications
 */
export async function markNotificationsSeenByLink(pathname: string): Promise<{ success: boolean; markedIds: string[]; error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, markedIds: [], error: 'Not authenticated' };
  }

  // Find unseen notifications where the link matches the current pathname
  // The link in data is stored as a JSON field, so we use ->> to extract it as text
  const { data: matchingNotifications, error: fetchError } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', user.id)
    .is('seen_at', null)
    .is('dismissed_at', null)
    .filter('data->>link', 'eq', pathname);

  if (fetchError) {
    console.error('Error fetching notifications by link:', fetchError);
    return { success: false, markedIds: [], error: fetchError.message };
  }

  if (!matchingNotifications || matchingNotifications.length === 0) {
    return { success: true, markedIds: [] };
  }

  const ids = matchingNotifications.map((n) => n.id);

  // Mark them as seen
  const { error: updateError } = await supabase
    .from('notifications')
    .update({ seen_at: new Date().toISOString() })
    .in('id', ids);

  if (updateError) {
    console.error('Error marking notifications as seen by link:', updateError);
    return { success: false, markedIds: [], error: updateError.message };
  }

  revalidateTag(`notifications-${user.id}`, 'max');
  return { success: true, markedIds: ids };
}

/**
 * Dismiss a notification (removes it from the notifications menu)
 */
export async function dismissNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('notifications')
    .update({
      dismissed_at: new Date().toISOString(),
      seen_at: new Date().toISOString(), // Also mark as seen when dismissing
    })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error dismissing notification:', error);
    return { success: false, error: error.message };
  }

  revalidateTag(`notifications-${user.id}`, 'max');
  return { success: true };
}

/**
 * Create mock notifications for testing (dev only)
 */
export async function createMockNotifications(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get some other users to use as actors (or use the current user if no others exist)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url')
    .neq('id', user.id)
    .limit(3);

  const actors = profiles && profiles.length > 0 ? profiles : [
    { id: user.id, full_name: 'You', nickname: 'you', avatar_url: null },
  ];

  const mockNotifications: Array<{
    type: NotificationType;
    entityType: 'photo' | 'album' | 'event';
    data: {
      title: string;
      thumbnail?: string;
      link: string;
      actorName?: string | null;
      actorNickname?: string | null;
      actorAvatar?: string | null;
    };
  }> = [
    {
      type: 'like_photo',
      entityType: 'photo',
      data: {
        title: 'Sunset Over the Ocean',
        link: '/gallery',
        actorName: actors[0]?.full_name ?? undefined,
        actorNickname: actors[0]?.nickname ?? undefined,
        actorAvatar: actors[0]?.avatar_url ?? undefined,
      },
    },
    {
      type: 'comment_album',
      entityType: 'album',
      data: {
        title: 'Nature Photography Collection',
        link: '/gallery',
        actorName: actors[1]?.full_name || actors[0]?.full_name || undefined,
        actorNickname: actors[1]?.nickname || actors[0]?.nickname || undefined,
        actorAvatar: actors[1]?.avatar_url || actors[0]?.avatar_url || undefined,
      },
    },
    {
      type: 'like_album',
      entityType: 'album',
      data: {
        title: 'Urban Landscapes',
        link: '/gallery',
        actorName: actors[2]?.full_name || actors[0]?.full_name || undefined,
        actorNickname: actors[2]?.nickname || actors[0]?.nickname || undefined,
        actorAvatar: actors[2]?.avatar_url || actors[0]?.avatar_url || undefined,
      },
    },
    {
      type: 'comment_event',
      entityType: 'event',
      data: {
        title: 'Photography Workshop',
        link: '/events',
        actorName: actors[0]?.full_name ?? undefined,
        actorNickname: actors[0]?.nickname ?? undefined,
        actorAvatar: actors[0]?.avatar_url ?? undefined,
      },
    },
    {
      type: 'event_reminder',
      entityType: 'event',
      data: {
        title: 'Group Photo Walk - Tomorrow',
        link: '/events',
      },
    },
  ];

  // Create notifications with slight delays to simulate different timestamps
  for (let i = 0; i < mockNotifications.length; i++) {
    const mock = mockNotifications[i];
    const actor = i < actors.length ? actors[i] : actors[0];

    await createNotification({
      userId: user.id,
      actorId: mock.type === 'event_reminder' ? null : actor?.id,
      type: mock.type,
      entityType: mock.entityType,
      entityId: `mock-${i}`,
      data: mock.data,
    });

    // Small delay to create different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Invalidate the notifications cache so the new notifications appear
  revalidateTag(`notifications-${user.id}`, 'max');

  return { success: true };
}
