'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createNotification } from '@/lib/notifications/create';
import type { NotificationType } from '@/types/notifications';

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

  return { success: true };
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
      actorName: string | null;
      actorNickname: string | null;
      actorAvatar: string | null;
    };
  }> = [
    {
      type: 'like_photo',
      entityType: 'photo',
      data: {
        title: 'Sunset Over the Ocean',
        thumbnail: null,
        link: '/gallery',
        actorName: actors[0]?.full_name || null,
        actorNickname: actors[0]?.nickname || null,
        actorAvatar: actors[0]?.avatar_url || null,
      },
    },
    {
      type: 'comment_album',
      entityType: 'album',
      data: {
        title: 'Nature Photography Collection',
        thumbnail: null,
        link: '/gallery',
        actorName: actors[1]?.full_name || actors[0]?.full_name || null,
        actorNickname: actors[1]?.nickname || actors[0]?.nickname || null,
        actorAvatar: actors[1]?.avatar_url || actors[0]?.avatar_url || null,
      },
    },
    {
      type: 'like_album',
      entityType: 'album',
      data: {
        title: 'Urban Landscapes',
        thumbnail: null,
        link: '/gallery',
        actorName: actors[2]?.full_name || actors[0]?.full_name || null,
        actorNickname: actors[2]?.nickname || actors[0]?.nickname || null,
        actorAvatar: actors[2]?.avatar_url || actors[0]?.avatar_url || null,
      },
    },
    {
      type: 'comment_event',
      entityType: 'event',
      data: {
        title: 'Photography Workshop',
        thumbnail: null,
        link: '/events',
        actorName: actors[0]?.full_name || null,
        actorNickname: actors[0]?.nickname || null,
        actorAvatar: actors[0]?.avatar_url || null,
      },
    },
    {
      type: 'event_reminder',
      entityType: 'event',
      data: {
        title: 'Group Photo Walk - Tomorrow',
        thumbnail: null,
        link: '/events',
        actorName: null,
        actorNickname: null,
        actorAvatar: null,
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
  revalidateTag(`notifications-${user.id}`);

  return { success: true };
}
