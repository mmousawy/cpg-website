'use client';

import type { NotificationData, NotificationType, NotificationWithActor } from '@/types/notifications';
import clsx from 'clsx';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Image from 'next/image';
import Link from 'next/link';
import Avatar from '../auth/Avatar';

// SVG icons
import CheckSVG from 'public/icons/check.svg';
import CloseSVG from 'public/icons/close.svg';
import CalendarSVG from 'public/icons/notification-calendar.svg';
import CommentSVG from 'public/icons/notification-comment.svg';
import HeartSVG from 'public/icons/notification-heart.svg';
import MegaphoneSVG from 'public/icons/notification-megaphone.svg';

dayjs.extend(relativeTime);

// Map notification types to their SVG icons
export const notificationIcons: Record<NotificationType, React.FC<{ className?: string }>> = {
  like_photo: HeartSVG,
  like_album: HeartSVG,
  comment_photo: CommentSVG,
  comment_album: CommentSVG,
  comment_event: CommentSVG,
  follow: HeartSVG,
  event_reminder: CalendarSVG,
  event_announcement: MegaphoneSVG,
  admin_message: MegaphoneSVG,
};

export const notificationMessages: Record<NotificationType, (actor: string | null, data: NotificationData | null) => string> = {
  like_photo: (actor) => `${actor || 'Someone'} liked your photo`,
  like_album: (actor) => `${actor || 'Someone'} liked your album`,
  comment_photo: (actor) => `${actor || 'Someone'} commented on your photo`,
  comment_album: (actor) => `${actor || 'Someone'} commented on your album`,
  comment_event: (actor) => `${actor || 'Someone'} commented on the event`,
  follow: (actor) => `${actor || 'Someone'} started following you`,
  event_reminder: () => 'Event reminder',
  event_announcement: () => 'New event announcement',
  admin_message: () => 'Admin message',
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
  const actorName = notification.actor?.full_name || notification.actor?.nickname || null;
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
        ) : notification.actor?.avatar_url ? (
          <Avatar
            size="sm"
            avatarUrl={notification.actor.avatar_url}
            fullName={notification.actor.full_name}
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
            className="text-xs truncate mt-0.5 text-foreground/70"
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
