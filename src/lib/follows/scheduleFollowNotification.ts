import type { NotificationData } from '@/types/notifications';
import {
  buildNotificationDedupeKey,
  cancelPendingNotification,
  NOTIFICATION_DELAY_MS,
  scheduleNotification,
} from '@/lib/notifications/schedule';

export { NOTIFICATION_DELAY_MS as FOLLOW_NOTIFICATION_DELAY_MS };

type ScheduleFollowNotificationParams = {
  followerId: string;
  followingId: string;
  data: NotificationData;
};

export async function cancelPendingFollowNotification(
  followerId: string,
  followingId: string,
): Promise<void> {
  await cancelPendingNotification(
    buildNotificationDedupeKey({
      type: 'follow',
      recipientUserId: followingId,
      actorId: followerId,
      entityType: 'profile',
      entityId: followerId,
    }),
  );
}

export async function scheduleFollowNotification({
  followerId,
  followingId,
  data,
}: ScheduleFollowNotificationParams): Promise<void> {
  await scheduleNotification({
    userId: followingId,
    actorId: followerId,
    type: 'follow',
    entityType: 'profile',
    entityId: followerId,
    data,
    validateAction: 'follow',
  });
}
