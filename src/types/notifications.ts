import type { Tables } from '@/database.types';

export type Notification = Tables<'notifications'>;
export type Profile = Tables<'profiles'>;

export type NotificationType =
  | 'like_photo'
  | 'like_album'
  | 'comment_photo'
  | 'comment_album'
  | 'comment_event'
  | 'comment_challenge'
  | 'comment_scene_event'
  | 'comment_reply'
  | 'follow'
  | 'followed_upload'
  | 'event_reminder'
  | 'event_announcement'
  | 'challenge_announced'
  | 'new_submission'
  | 'submission_accepted'
  | 'submission_rejected'
  | 'admin_message'
  | 'report_submitted'
  | 'report_resolved'
  | 'shared_album_invite_received'
  | 'shared_album_request_received'
  | 'shared_album_request_accepted'
  | 'shared_album_request_declined'
  | 'shared_album_invite_accepted'
  | 'feedback_submitted'
  | 'member_signed_up'
  | 'member_joined'
  | 'member_deleted';

/** Notification types covered by the events email preference, not the weekly digest */
export const EVENT_NOTIFICATION_TYPES = [
  'comment_event',
  'event_reminder',
  'event_announcement',
] as const satisfies readonly NotificationType[];

export type EventNotificationType = (typeof EVENT_NOTIFICATION_TYPES)[number];

export function isEventNotificationType(type: string): type is EventNotificationType {
  return (EVENT_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

/** In-app/email notification types that must only be delivered to admins */
export const ADMIN_NOTIFICATION_TYPES = [
  'new_submission',
  'report_submitted',
  'feedback_submitted',
  'member_signed_up',
  'member_joined',
  'member_deleted',
] as const satisfies readonly NotificationType[];

export type AdminNotificationType = (typeof ADMIN_NOTIFICATION_TYPES)[number];

export function isAdminNotificationType(type: string): type is AdminNotificationType {
  return (ADMIN_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

/** PostgREST `not.in` value that excludes admin-only notification types */
export const ADMIN_NOTIFICATION_TYPES_NOT_IN = `(${ADMIN_NOTIFICATION_TYPES.join(',')})`;

export type NotificationEntityType =
  | 'photo'
  | 'album'
  | 'event'
  | 'profile'
  | 'challenge'
  | 'scene_event'
  | 'system'
  | 'report'
  | 'feedback';

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
