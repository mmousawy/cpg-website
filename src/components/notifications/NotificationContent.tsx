'use client';

import type { NotificationData, NotificationType, NotificationWithActor } from '@/types/notifications';
import clsx from 'clsx';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Image from 'next/image';
import Link from 'next/link';
import Avatar from '../auth/Avatar';

// SVG icons
import AwardStarSVG from 'public/icons/award-star-mini.svg';
import CancelSVG from 'public/icons/cancel.svg';
import CheckSVG from 'public/icons/check.svg';
import CloseSVG from 'public/icons/close.svg';
import CalendarSVG from 'public/icons/notification-calendar.svg';
import CommentSVG from 'public/icons/notification-comment.svg';
import HeartSVG from 'public/icons/notification-heart.svg';
import MegaphoneSVG from 'public/icons/notification-megaphone.svg';
import PhotoStackSVG from 'public/icons/photo-stack-mini.svg';
import UsersMicroSVG from 'public/icons/users-micro.svg';

dayjs.extend(relativeTime);

function formatWithOthers(
  actor: string | null,
  otherCount: number,
  action: string,
): string {
  const name = actor || 'Someone';
  if (otherCount > 0) {
    return `${name} and ${otherCount} other${otherCount === 1 ? '' : 's'} ${action}`;
  }
  return `${name} ${action}`;
}

function formatCommentMessage(
  actor: string | null,
  data: NotificationData | null,
  target: string,
): string {
  const otherCount = (data?.otherCount as number) || 0;
  const commentCount = (data?.commentCount as number) || 1;
  const name = actor || 'Someone';

  if (otherCount > 0) {
    return `${name} and ${otherCount} other${otherCount === 1 ? '' : 's'} commented on ${target}`;
  }
  if (commentCount > 1) {
    return `${name} commented ${commentCount} times on ${target}`;
  }
  return `${name} commented on ${target}`;
}

function formatReplyMessage(actor: string | null, data: NotificationData | null): string {
  const commentCount = (data?.commentCount as number) || 1;
  const name = actor || 'Someone';
  if (commentCount > 1) {
    return `${name} replied ${commentCount} times to your comment`;
  }
  return `${name} replied to your comment`;
}

// Map notification types to their SVG icons
export const notificationIcons: Record<NotificationType, React.FC<{ className?: string }>> = {
  like_photo: HeartSVG,
  like_album: HeartSVG,
  comment_photo: CommentSVG,
  comment_album: CommentSVG,
  comment_event: CommentSVG,
  comment_challenge: CommentSVG,
  comment_scene_event: CommentSVG,
  comment_reply: CommentSVG,
  follow: HeartSVG,
  followed_upload: PhotoStackSVG,
  event_reminder: CalendarSVG,
  event_announcement: MegaphoneSVG,
  challenge_announced: AwardStarSVG,
  new_submission: PhotoStackSVG,
  submission_accepted: CheckSVG,
  submission_rejected: CancelSVG,
  admin_message: MegaphoneSVG,
  report_submitted: MegaphoneSVG,
  report_resolved: CheckSVG,
  shared_album_invite_received: PhotoStackSVG,
  shared_album_request_received: PhotoStackSVG,
  shared_album_request_accepted: CheckSVG,
  shared_album_request_declined: CancelSVG,
  shared_album_invite_accepted: CheckSVG,
  feedback_submitted: CommentSVG,
  member_signed_up: UsersMicroSVG,
  member_joined: UsersMicroSVG,
  member_deleted: CancelSVG,
};

export const notificationMessages: Record<NotificationType, (actor: string | null, data: NotificationData | null) => string> = {
  like_photo: (actor, data) => formatWithOthers(actor, (data?.otherCount as number) || 0, 'liked your photo'),
  like_album: (actor, data) => formatWithOthers(actor, (data?.otherCount as number) || 0, 'liked your album'),
  comment_photo: (actor, data) => formatCommentMessage(actor, data, 'your photo'),
  comment_album: (actor, data) => formatCommentMessage(actor, data, 'your album'),
  comment_event: (actor, data) => formatCommentMessage(actor, data, 'the event'),
  comment_challenge: (actor, data) => formatCommentMessage(actor, data, 'the challenge'),
  comment_scene_event: (actor, data) => formatCommentMessage(actor, data, 'a Scene event'),
  comment_reply: (actor, data) => formatReplyMessage(actor, data),
  follow: (actor) => `${actor || 'Someone'} started following you`,
  followed_upload: (actor, data) => {
    const count = (data?.photoCount as number) || 1;
    return `${actor || 'Someone'} uploaded ${count} new photo${count !== 1 ? 's' : ''}`;
  },
  event_reminder: () => 'Event reminder',
  event_announcement: () => 'New event announcement',
  challenge_announced: () => 'New challenge announced',
  new_submission: (actor, data) => {
    const count = (data?.photoCount as number) || 1;
    return `${actor || 'Someone'} submitted ${count} photo${count !== 1 ? 's' : ''}`;
  },
  submission_accepted: (_, data) => {
    const title = data?.title as string | undefined;
    return title
      ? `Your photo was accepted for "${title}"`
      : 'Your submission was accepted';
  },
  submission_rejected: (_, data) => {
    const title = data?.title as string | undefined;
    return title
      ? `Your photo was not accepted for "${title}"`
      : 'Your submission was not accepted';
  },
  admin_message: () => 'Admin message',
  report_submitted: () => 'Report submitted',
  report_resolved: (_, data) => {
    const title = data?.title as string | undefined;
    return title
      ? `Your report has been resolved: ${title}`
      : 'Your report has been resolved';
  },
  shared_album_invite_received: (actor, data) => {
    const title = data?.title as string | undefined;
    return title
      ? `${actor || 'Someone'} invited you to the album "${title}"`
      : `${actor || 'Someone'} invited you to an album`;
  },
  shared_album_request_received: (actor, data) => {
    const title = data?.title as string | undefined;
    return title
      ? `${actor || 'Someone'} requested to join "${title}"`
      : `${actor || 'Someone'} requested to join your album`;
  },
  shared_album_request_accepted: (_, data) => {
    const title = data?.title as string | undefined;
    return title
      ? `Your request to join "${title}" was accepted`
      : 'Your request to join the album was accepted';
  },
  shared_album_request_declined: (_, data) => {
    const title = data?.title as string | undefined;
    return title
      ? `Your request to join "${title}" was declined`
      : 'Your request to join the album was declined';
  },
  shared_album_invite_accepted: (actor, data) => {
    const title = data?.title as string | undefined;
    return title
      ? `${actor || 'Someone'} accepted your invite to "${title}"`
      : `${actor || 'Someone'} accepted your invite`;
  },
  feedback_submitted: (actor) => `New feedback from ${actor || 'someone'}`,
  member_signed_up: (actor, data) => {
    const email = data?.title as string | undefined;
    if (email && actor && email !== actor) {
      return `${actor} signed up`;
    }
    return `${actor || email || 'Someone'} signed up`;
  },
  member_joined: (actor) => `${actor || 'Someone'} joined the community`,
  member_deleted: (actor, data) => {
    if (data?.initiatedByAdmin) {
      return `${actor || 'A member'}'s account was scheduled for deletion`;
    }
    return `${actor || 'Someone'} scheduled their account for deletion`;
  },
};

type NotificationContentProps = {
  notification: NotificationWithActor;
  onDismiss?: (e: React.MouseEvent) => void;
  onMarkAsSeen?: (e: React.MouseEvent) => void;
  /** Callback when the notification link is clicked */
  onLinkClick?: () => void;
  /** Whether this notification is unseen (affects styling) */
  isUnseen?: boolean;
  /** Whether to always show the unseen dot (for toasts) */
  alwaysShowDot?: boolean;
};

export default function NotificationContent({
  notification,
  onDismiss,
  onMarkAsSeen,
  onLinkClick,
  isUnseen = false,
  alwaysShowDot = false,
}: NotificationContentProps) {
  const actorName = notification.actor?.full_name
    || notification.actor?.nickname
    || (notification.data?.actorName as string | undefined)
    || null;
  const notificationType = notification.type as NotificationType;
  const message = notificationMessages[notificationType]?.(actorName, notification.data) || 'New notification';
  const IconComponent = notificationIcons[notificationType] || MegaphoneSVG;
  const thumbnail = notification.data?.thumbnail as string | undefined;
  const link = notification.data?.link as string | undefined;
  const timeAgo = dayjs(notification.created_at).fromNow();
  const showDot = alwaysShowDot || isUnseen;

  const content = (
    <>
      {/* Thumbnail, actor avatar, or icon */}
      <div
        className="relative shrink-0"
      >
        {thumbnail ? (
          <div
            className="size-10 rounded-sm overflow-hidden bg-border-color"
          >
            <Image
              src={thumbnail}
              alt=""
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </div>
        ) : notification.actor ? (
          <Avatar
            size="sm"
            avatarUrl={notification.actor.avatar_url}
            fullName={notification.actor.full_name}
            nickname={notification.actor.nickname}
          />
        ) : (
          <div
            className="flex size-10 items-center justify-center rounded-full bg-foreground/5"
          >
            <IconComponent
              className="size-6 fill-primary stroke-none"
            />
          </div>
        )}
        {showDot && (
          <span
            className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background-light"
          />
        )}
      </div>

      {/* Text content */}
      <div
        className="flex-1 min-w-0"
      >
        <p
          className={clsx(
            'text-sm',
            isUnseen ? 'font-semibold text-foreground' : 'font-normal text-foreground',
          )}
        >
          {message}
        </p>
        {notification.data?.title && (
          <p
            className="text-xs truncate mt-0.5 text-foreground/80"
          >
            {notification.data.title as string}
          </p>
        )}
        <p
          className="text-xs mt-1 text-foreground/50"
        >
          {timeAgo}
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Clickable content area - Link or div */}
      {link ? (
        <Link
          href={link}
          onClick={onLinkClick}
          className="flex items-start gap-3 flex-1 min-w-0"
        >
          {content}
        </Link>
      ) : (
        <div
          className="flex items-start gap-3 flex-1 min-w-0"
        >
          {content}
        </div>
      )}

      {/* Action buttons - outside the link */}
      {(onMarkAsSeen || onDismiss) && (
        <div
          className="flex items-center gap-1 shrink-0"
        >
          {onMarkAsSeen && (
            <button
              onClick={onMarkAsSeen}
              className="p-1 rounded-full hover:bg-foreground/10 text-foreground/80 fill-foreground/80 hover:text-foreground transition-colors"
              aria-label="Mark as seen"
              title="Mark as seen"
            >
              <CheckSVG
                className="size-4 stroke-current"
              />
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 rounded-full hover:bg-foreground/10 text-foreground/80 hover:text-foreground transition-colors"
              aria-label="Dismiss notification"
              title="Dismiss"
            >
              <CloseSVG
                className="size-4 fill-current"
              />
            </button>
          )}
        </div>
      )}
    </>
  );
}
