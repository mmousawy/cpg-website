'use client';

import type { NotificationData, NotificationType, NotificationWithActor } from '@/types/notifications';
import clsx from 'clsx';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Image from 'next/image';
import Avatar from '../auth/Avatar';

// SVG icons
import CalendarSVG from 'public/icons/calendar.svg';
import CloseSVG from 'public/icons/close.svg';
import FolderSVG from 'public/icons/folder.svg';
import HeartFilledSVG from 'public/icons/heart-filled.svg';
import ImageSVG from 'public/icons/image.svg';
import MegaphoneSVG from 'public/icons/megaphone.svg';

dayjs.extend(relativeTime);

type NotificationItemProps = {
  notification: NotificationWithActor;
  onView: (id: string, link?: string) => void;
  onDismiss?: (id: string) => void;
  /** Whether to show the dismiss button (default: false) */
  showDismiss?: boolean;
};

// Map notification types to their SVG icons
const notificationIcons: Record<NotificationType, React.FC<{ className?: string }>> = {
  like_photo: HeartFilledSVG,
  like_album: HeartFilledSVG,
  comment_photo: ImageSVG,
  comment_album: FolderSVG,
  comment_event: CalendarSVG,
  follow: HeartFilledSVG,
  event_reminder: CalendarSVG,
  event_announcement: MegaphoneSVG,
  admin_message: MegaphoneSVG,
};

const notificationMessages: Record<NotificationType, (actor: string | null, data: NotificationData | null) => string> = {
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

export default function NotificationItem({ notification, onView, onDismiss, showDismiss = false }: NotificationItemProps) {
  const actorName = notification.actor?.full_name || notification.actor?.nickname || null;
  const notificationType = notification.type as NotificationType;
  const message = notificationMessages[notificationType]?.(actorName, notification.data) || 'New notification';
  const IconComponent = notificationIcons[notificationType] || MegaphoneSVG;
  const isUnseen = !notification.seen_at;
  const link = notification.data?.link as string | undefined;
  const thumbnail = notification.data?.thumbnail as string | undefined;

  const handleClick = () => {
    onView(notification.id, link);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onView(notification.id, link);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss?.(notification.id);
  };

  const timeAgo = dayjs(notification.created_at).fromNow();

  return (
    <div
      role="button"
      tabIndex={0}
      className={clsx(
        'relative flex items-start gap-3 p-4 hover:bg-background cursor-pointer transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
        isUnseen ? 'border-l-3 border-l-primary bg-primary/5' : 'border-l-3 border-l-transparent',
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Thumbnail, actor avatar, or icon */}
      <div
        className="relative shrink-0"
      >
        {thumbnail ? (
          // Show entity thumbnail if available
          <div
            className="size-10 rounded-md overflow-hidden bg-border-color"
          >
            <Image
              src={thumbnail}
              alt=""
              width={32}
              height={32}
              className="h-full w-full object-cover"
            />
          </div>
        ) : notification.actor?.avatar_url ? (
          // Show actor avatar if available
          <Avatar
            size="sm"
            avatarUrl={notification.actor.avatar_url}
            fullName={notification.actor.full_name}
          />
        ) : (
          // Fallback to SVG icon
          <div
            className="flex size-10 items-center justify-center rounded-full bg-[#ffffff1a]"
          >
            <IconComponent
              className="size-6 fill-primary stroke-none"
            />
          </div>
        )}
        {/* Unseen indicator dot */}
        {isUnseen && (
          <span
            className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background-light"
          />
        )}
      </div>

      {/* Content */}
      <div
        className="flex-1 min-w-0"
      >
        <div
          className="flex items-start justify-between gap-2"
        >
          <div
            className="flex-1 min-w-0"
          >
            <p
              className={clsx('text-sm', isUnseen ? 'font-semibold text-foreground' : 'font-normal text-foreground/80')}
            >
              {message}
            </p>
            {notification.data?.title && (
              <p
                className={clsx('text-xs truncate mt-0.5', isUnseen ? 'text-foreground/70' : 'text-foreground/50')}
              >
                {notification.data.title as string}
              </p>
            )}
            <p
              className={clsx('text-xs mt-1', isUnseen ? 'text-foreground/50' : 'text-foreground/40')}
            >
              {timeAgo}
            </p>
          </div>

          {/* Dismiss button */}
          {showDismiss && (
            <button
              onClick={handleDismiss}
              className="shrink-0 p-1 rounded-full hover:bg-foreground/10 text-foreground/40 hover:text-foreground transition-colors"
              aria-label="Dismiss notification"
            >
              <CloseSVG
                className="size-4 fill-current"
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
