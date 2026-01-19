'use client';

import { markNotificationAsSeen } from '@/lib/actions/notifications';
import type { NotificationWithActor } from '@/types/notifications';
import { toast } from 'sonner';
import NotificationContent from './NotificationContent';

type NotificationToastProps = {
  notification: NotificationWithActor;
  toastId: string | number;
};

export default function NotificationToast({ notification, toastId }: NotificationToastProps) {
  const handleLinkClick = async () => {
    await markNotificationAsSeen(notification.id);
    toast.dismiss(toastId);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.dismiss(toastId);
  };

  return (
    <div
      className="flex items-center gap-3 p-3 min-w-0"
    >
      <NotificationContent
        notification={notification}
        onLinkClick={handleLinkClick}
        onDismiss={handleDismiss}
        isUnseen
        alwaysShowDot
      />
    </div>
  );
}
