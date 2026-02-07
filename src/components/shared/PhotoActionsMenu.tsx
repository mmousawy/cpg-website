'use client';

import { useContext } from 'react';
import { ModalContext } from '@/app/providers/ModalProvider';
import { useAuth } from '@/context/AuthContext';
import ReportModal from '@/components/shared/ReportModal';
import WarningMicroSVG from 'public/icons/warning-micro.svg';

type PhotoActionsMenuProps = {
  photoId: string;
  photoTitle: string | null;
  photoUserId: string | null;
  onActionClick?: () => void; // Callback to close the popover
};

export default function PhotoActionsMenu({ photoId, photoTitle, photoUserId, onActionClick }: PhotoActionsMenuProps) {
  const { user } = useAuth();
  const modalContext = useContext(ModalContext);

  // Hide if user is reporting their own content (unless in development)
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev && user && photoUserId && user.id === photoUserId) {
    return null;
  }

  const handleReportClick = () => {
    // Close the popover
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
        Report photo
      </span>
    </button>
  );
}
