'use client';

import { useContext } from 'react';
import Link from 'next/link';
import { ModalContext } from '@/app/providers/ModalProvider';
import { useAuth } from '@/context/AuthContext';
import ReportModal from '@/components/shared/ReportModal';
import EditMiniSVG from 'public/icons/edit-mini.svg';
import WarningMicroSVG from 'public/icons/warning-micro.svg';

type ProfileActionsMenuProps = {
  profileId: string;
  profileNickname: string;
  onActionClick?: () => void; // Callback to close the popover
};

export default function ProfileActionsMenu({ profileId, profileNickname, onActionClick }: ProfileActionsMenuProps) {
  const { user } = useAuth();
  const modalContext = useContext(ModalContext);

  const isOwnProfile = !!(user && user.id === profileId);

  const menuItemClass =
    'flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground';

  if (isOwnProfile) {
    return (
      <Link
        href="/account"
        className={menuItemClass}
        onClick={() => onActionClick?.()}
      >
        <EditMiniSVG
          className="size-4 shrink-0"
        />
        <span>
          Edit profile
        </span>
      </Link>
    );
  }

  const handleReportClick = () => {
    onActionClick?.();

    modalContext.setSize('default');
    modalContext.setTitle(`Report user @${profileNickname}`);
    modalContext.setContent(
      <ReportModal
        entityType="profile"
        entityId={profileId}
        entityLabel={`user @${profileNickname}`}
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
      className={menuItemClass}
    >
      <WarningMicroSVG
        className="size-4 shrink-0"
      />
      <span>
        Report profile
      </span>
    </button>
  );
}
