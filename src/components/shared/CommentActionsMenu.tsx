'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import ReportModal from '@/components/shared/ReportModal';
import { useAuth } from '@/context/AuthContext';
import WarningMicroSVG from 'public/icons/warning-micro.svg';
import { useContext } from 'react';

type CommentActionsMenuProps = {
  commentId: string;
  commentUserId: string;
  onActionClick?: () => void; // Callback to close the popover
};

export default function CommentActionsMenu({ commentId, commentUserId, onActionClick }: CommentActionsMenuProps) {
  const { user } = useAuth();
  const modalContext = useContext(ModalContext);

  // Hide if user is reporting their own content (unless in development)
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev && user && user.id === commentUserId) {
    return null;
  }

  const handleReportClick = () => {
    // Close the popover
    onActionClick?.();

    modalContext.setSize('default');
    modalContext.setTitle('Report comment');
    modalContext.setContent(
      <ReportModal
        entityType="comment"
        entityId={commentId}
        entityLabel="this comment"
        onSuccess={() => {
          modalContext.setIsOpen(false);
        }}
      />,
    );
    modalContext.setIsOpen(true);
  };

  return (
    <button
      type="button"
      onClick={handleReportClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
    >
      <WarningMicroSVG
        className="size-4 shrink-0"
      />
      <span>
        Report comment
      </span>
    </button>
  );
}
