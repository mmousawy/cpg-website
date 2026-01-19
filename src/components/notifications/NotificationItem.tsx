'use client';

import type { NotificationWithActor } from '@/types/notifications';
import clsx from 'clsx';
import NotificationContent from './NotificationContent';

type NotificationItemProps = {
  notification: NotificationWithActor;
  onView: (id: string) => void;
  onDismiss?: (id: string) => void;
  onMarkAsSeen?: (id: string) => void;
  /** Whether to show the dismiss button (default: false) */
  showDismiss?: boolean;
};

export default function NotificationItem({ notification, onView, onDismiss, onMarkAsSeen, showDismiss = false }: NotificationItemProps) {
  const isUnseen = !notification.seen_at;

  const handleLinkClick = () => {
    onView(notification.id);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss?.(notification.id);
  };

  const handleMarkAsSeen = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsSeen?.(notification.id);
  };

  return (
    <div
      className={clsx(
        'relative flex items-center gap-3 p-4 hover:bg-background-medium transition-colors',
        isUnseen ? 'border-l-3 border-l-primary' : 'border-l-3 border-l-transparent opacity-80',
      )}
    >
      <NotificationContent
        notification={notification}
        onLinkClick={handleLinkClick}
        onDismiss={showDismiss ? handleDismiss : undefined}
        onMarkAsSeen={isUnseen && onMarkAsSeen ? handleMarkAsSeen : undefined}
        isUnseen={isUnseen}
      />
    </div>
  );
}
