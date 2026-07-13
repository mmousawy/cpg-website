'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import ReportModal from '@/components/shared/ReportModal';
import { useAuth } from '@/context/AuthContext';
import TrashMiniSVG from 'public/icons/trash-mini.svg';
import WarningMicroSVG from 'public/icons/warning-micro.svg';
import EditMiniSVG from 'public/icons/edit-mini.svg';
import { useContext } from 'react';

type CommentActionsMenuProps = {
  commentId: string;
  commentUserId: string;
  canDelete?: boolean;
  canEdit?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onActionClick?: () => void;
};

const menuItemClass =
  'flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground';
const dangerMenuItemClass =
  'flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300';

export function getCommentActionsVisibility({
  userId,
  commentUserId,
  isAdmin = false,
}: {
  userId?: string | null;
  commentUserId: string;
  isAdmin?: boolean;
}) {
  const isOwner = !!(userId && userId === commentUserId);
  const canDelete = isOwner || isAdmin;
  const canEdit = isOwner;
  const canReport = !isOwner;

  return {
    canDelete,
    canEdit,
    canReport,
    hasActions: canDelete || canEdit || canReport,
  };
}

export default function CommentActionsMenu({
  commentId,
  commentUserId,
  canDelete = false,
  canEdit = false,
  onDelete,
  onEdit,
  onActionClick,
}: CommentActionsMenuProps) {
  const { user } = useAuth();
  const modalContext = useContext(ModalContext);
  const { canReport } = getCommentActionsVisibility({
    userId: user?.id,
    commentUserId,
  });

  if (!canDelete && !canEdit && !canReport) {
    return null;
  }

  const handleReportClick = () => {
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

  const handleDeleteClick = () => {
    onActionClick?.();
    onDelete?.();
  };

  const handleEditClick = () => {
    onActionClick?.();
    onEdit?.();
  };

  return (
    <div>
      {canEdit && (
        <button
          type="button"
          onClick={handleEditClick}
          className={menuItemClass}
        >
          <EditMiniSVG
            className="size-4 shrink-0"
          />
          <span>
            Edit comment
          </span>
        </button>
      )}
      {canReport && (
        <button
          type="button"
          onClick={handleReportClick}
          className={menuItemClass}
        >
          <WarningMicroSVG
            className="size-4 shrink-0"
          />
          <span>
            Report comment
          </span>
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={handleDeleteClick}
          className={dangerMenuItemClass}
        >
          <TrashMiniSVG
            className="size-4 shrink-0"
          />
          <span>
            Delete comment
          </span>
        </button>
      )}
    </div>
  );
}
