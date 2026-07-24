import type { Json } from '@/database.types';
import { createNotification } from '@/lib/notifications/create';
import type { NotificationData } from '@/types/notifications';
import { createAdminClient } from '@/utils/supabase/admin';
import { after } from 'next/server';

export const FOLLOW_NOTIFICATION_DELAY_MS = 60_000;

type ScheduleFollowNotificationParams = {
  followerId: string;
  followingId: string;
  data: NotificationData;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function cancelPendingFollowNotification(
  followerId: string,
  followingId: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('pending_follow_notifications')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) {
    console.error('Failed to cancel pending follow notification:', error);
  }
}

export async function deliverPendingFollowNotification(
  followerId: string,
  followingId: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: pending, error: pendingError } = await supabase
    .from('pending_follow_notifications')
    .select('deliver_at, notification_data')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (pendingError) {
    console.error('Failed to load pending follow notification:', pendingError);
    return;
  }

  if (!pending) {
    return;
  }

  if (new Date(pending.deliver_at).getTime() > Date.now()) {
    return;
  }

  const { data: follow, error: followError } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (followError) {
    console.error('Failed to verify follow before delivering notification:', followError);
    return;
  }

  if (!follow) {
    await cancelPendingFollowNotification(followerId, followingId);
    return;
  }

  const notificationData = (pending.notification_data || {}) as NotificationData;

  const result = await createNotification({
    userId: followingId,
    actorId: followerId,
    type: 'follow',
    entityType: 'profile',
    entityId: followerId,
    data: notificationData,
  });

  if (!result.success) {
    console.error('Failed to deliver follow notification:', result.error);
    return;
  }

  await cancelPendingFollowNotification(followerId, followingId);
}

export async function scheduleFollowNotification({
  followerId,
  followingId,
  data,
}: ScheduleFollowNotificationParams): Promise<void> {
  const supabase = createAdminClient();
  const deliverAt = new Date(Date.now() + FOLLOW_NOTIFICATION_DELAY_MS).toISOString();

  const { error } = await supabase
    .from('pending_follow_notifications')
    .upsert({
      follower_id: followerId,
      following_id: followingId,
      deliver_at: deliverAt,
      notification_data: data as Json,
    });

  if (error) {
    console.error('Failed to schedule follow notification:', error);
    return;
  }

  after(async () => {
    try {
      await sleep(FOLLOW_NOTIFICATION_DELAY_MS);
      await deliverPendingFollowNotification(followerId, followingId);
    } catch (error) {
      console.error('Background follow notification delivery failed:', error);
    }
  });
}
