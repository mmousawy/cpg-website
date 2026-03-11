'use client';

import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { ModalContext } from '@/app/providers/ModalProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import ReportModal from '@/components/shared/ReportModal';
import EditSceneEventModal from '@/components/scene/EditSceneEventModal';
import { useDeleteSceneEvent } from '@/hooks/useSceneEvents';
import type { SceneEvent } from '@/types/scene';

import EditMiniSVG from 'public/icons/edit-mini.svg';
import TrashMiniSVG from 'public/icons/trash-mini.svg';
import WarningMicroSVG from 'public/icons/warning-micro.svg';

type SceneActionsMenuProps = {
  event: SceneEvent;
  onActionClick?: () => void;
};

export default function SceneActionsMenu({
  event,
  onActionClick,
}: SceneActionsMenuProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const modalContext = useContext(ModalContext);
  const confirm = useConfirm();
  const deleteMutation = useDeleteSceneEvent();

  const isOwner = !!(user && event.submitted_by && user.id === event.submitted_by);
  const canEdit = isOwner || isAdmin;
  const canDelete = isOwner;

  const handleEditClick = () => {
    onActionClick?.();

    modalContext.setSize('medium');
    modalContext.setFlushContentTop(true);
    modalContext.setTitle('Edit event');
    modalContext.setContent(
      <EditSceneEventModal
        event={event}
      />,
    );
    modalContext.setIsOpen(true);
  };

  const handleDeleteClick = async () => {
    onActionClick?.();

    const confirmed = await confirm({
      title: 'Delete event',
      message:
        'Are you sure you want to delete this event? It will be removed from the public list.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(event.id);
      onActionClick?.();
      router.replace('/scene');
    } catch {
      // Error is handled by the mutation's onError
    }
  };

  const handleReportClick = () => {
    onActionClick?.();

    modalContext.setSize('default');
    modalContext.setTitle(`Report "${event.title}"`);
    modalContext.setContent(
      <ReportModal
        entityType="scene_event"
        entityId={event.id}
        entityLabel={event.title}
        onSuccess={() => {
          modalContext.setIsOpen(false);
        }}
      />,
    );
    modalContext.setIsOpen(true);
  };

  const menuItemClass =
    'flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground';
  const dangerMenuItemClass =
    'flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300';

  // Owner: Edit, Delete
  if (isOwner) {
    return (
      <div>
        <button
          type="button"
          onClick={handleEditClick}
          className={menuItemClass}
        >
          <EditMiniSVG
            className="size-4 shrink-0"
          />
          <span>
            Edit event
          </span>
        </button>
        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={deleteMutation.isPending}
          className={dangerMenuItemClass}
        >
          <TrashMiniSVG
            className="size-4 shrink-0"
          />
          <span>
            Delete event
          </span>
        </button>
      </div>
    );
  }

  // Admin (not owner): Edit
  if (isAdmin) {
    return (
      <div>
        <button
          type="button"
          onClick={handleEditClick}
          className={menuItemClass}
        >
          <EditMiniSVG
            className="size-4 shrink-0"
          />
          <span>
            Edit event
          </span>
        </button>
        <button
          type="button"
          onClick={handleReportClick}
          className={menuItemClass}
        >
          <WarningMicroSVG
            className="size-4 shrink-0"
          />
          <span>
            Report
          </span>
        </button>
      </div>
    );
  }

  // Non-owner, non-admin: Report
  return (
    <button
      type="button"
      onClick={handleReportClick}
      className={menuItemClass}
    >
      <WarningMicroSVG
        className="size-4 shrink-0"
      />
      <span>
        Report
      </span>
    </button>
  );
}
