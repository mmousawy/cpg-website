import type { Tables } from '@/database.types';

export type Notification = Tables<'notifications'>;
export type Profile = Tables<'profiles'>;

export type NotificationType =
  | 'like_photo'
  | 'like_album'
  | 'comment_photo'
  | 'comment_album'
  | 'comment_event'
  | 'follow'
  | 'event_reminder'
  | 'event_announcement'
  | 'admin_message';

export type NotificationEntityType = 'photo' | 'album' | 'event' | 'profile' | 'system';

// Data stored in the notification's JSON `data` field
export type NotificationData = {
  title?: string;
  thumbnail?: string | null;
  link?: string;
  actorName?: string | null;
  actorNickname?: string | null;
  actorAvatar?: string | null;
  [key: string]: unknown;
};

// Actor fields selected when fetching notifications with actor info
export type NotificationActor = Pick<Profile, 'nickname' | 'avatar_url' | 'full_name'>;

export type NotificationWithActor = Omit<Notification, 'data'> & {
  data: NotificationData | null;
  actor?: NotificationActor | null;
};

export type CreateNotificationParams = {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId?: string | null;
  data?: NotificationData;
};
