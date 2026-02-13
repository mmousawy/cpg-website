'use client';

import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { ModalContext } from '@/app/providers/ModalProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useAuth } from '@/context/AuthContext';
import { useDeletePhotos } from '@/hooks/usePhotoMutations';
import ReportModal from '@/components/shared/ReportModal';
import EditMiniSVG from 'public/icons/edit-mini.svg';
import TrashMiniSVG from 'public/icons/trash-mini.svg';
import WarningMicroSVG from 'public/icons/warning-micro.svg';

type PhotoActionsMenuProps = {
  photoId: string;
  photoTitle: string | null;
  photoUserId: string | null;
  /** Storage path of the photo (needed for owner delete) */
  storagePath?: string | null;
  onActionClick?: () => void; // Callback to close the popover
};

export default function PhotoActionsMenu({ photoId, photoTitle, photoUserId, storagePath, onActionClick }: PhotoActionsMenuProps) {
  const { user, profile } = useAuth();
  const modalContext = useContext(ModalContext);
  const confirm = useConfirm();
  const router = useRouter();

  const isOwner = !!(user && photoUserId && user.id === photoUserId);
  const nickname = profile?.nickname;

  const deletePhotosMutation = useDeletePhotos(user?.id, 'all', nickname);

  const handleEditClick = () => {
    onActionClick?.();
    router.push('/account/photos');
  };

  const handleDeleteClick = async () => {
    onActionClick?.();

    const confirmed = await confirm({
      title: 'Delete photo',
      message: 'Are you sure you want to delete this photo? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (!confirmed || !user) return;

    // Build storage path for file cleanup
    const storagePaths: string[] = [];
    if (storagePath) {
      const pathParts = storagePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      storagePaths.push(`${user.id}/${fileName}`);
    }

    try {
      await deletePhotosMutation.mutateAsync({
        photoIds: [photoId],
        storagePaths,
      });

      // Navigate to user's profile after successful deletion
      if (nickname) {
        router.push(`/@${nickname}`);
      } else {
        router.push('/');
      }
    } catch {
      // Error is handled by the mutation's onError
    }
  };

  const handleReportClick = () => {
    onActionClick?.();

    modalContext.setSize('default');
    modalContext.setTitle(`Report photo "${photoTitle || 'Untitled'}"`);
    modalContext.setContent(
      <ReportModal
        entityType="photo"
        entityId={photoId}
        entityLabel={`photo "${photoTitle || 'Untitled'}"`}
        onSuccess={() => {
          modalContext.setIsOpen(false);
        }}
      />,
    );
    modalContext.setIsOpen(true);
  };

  const menuItemClass = 'flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground';
  const dangerMenuItemClass = 'flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300';

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
            Manage photos
          </span>
        </button>
        <button
          type="button"
          onClick={handleDeleteClick}
          className={dangerMenuItemClass}
        >
          <TrashMiniSVG
            className="size-4 shrink-0"
          />
          <span>
            Delete photo
          </span>
        </button>
      </div>
    );
  }

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
        Report photo
      </span>
    </button>
  );
}
