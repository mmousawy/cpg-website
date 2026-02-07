'use client';

import { useContext } from 'react';
import { ModalContext } from '@/app/providers/ModalProvider';
import { useAuth } from '@/context/AuthContext';
import ReportModal from '@/components/shared/ReportModal';
import Button from '@/components/shared/Button';
import type { ReportEntityType } from '@/types/reports';
import WarningMicroSVG from 'public/icons/warning-micro.svg';

type ReportButtonProps = {
  entityType: ReportEntityType;
  entityId: string;
  entityLabel?: string;
  entityOwnerId?: string; // User ID of the content owner - hide button if current user owns it
  variant?: 'button' | 'link';
  className?: string;
};

/**
 * Button to report content (photos, albums, profiles, comments).
 * Opens a modal for submitting a report.
 * Hidden if user is reporting their own content.
 */
export default function ReportButton({
  entityType,
  entityId,
  entityLabel,
  entityOwnerId,
  variant = 'button',
  className,
}: ReportButtonProps) {
  const { user } = useAuth();
  const modalContext = useContext(ModalContext);

  // Hide if user is reporting their own content (unless in development)
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev && user && entityOwnerId && user.id === entityOwnerId) {
    return null;
  }

  const handleClick = () => {
    modalContext.setSize('default');
    modalContext.setTitle(`Report ${entityLabel || entityType}`);
    modalContext.setContent(
      <ReportModal
        entityType={entityType}
        entityId={entityId}
        entityLabel={entityLabel}
        onSuccess={() => {
          modalContext.setIsOpen(false);
        }}
      />,
    );
    modalContext.setIsOpen(true);
  };

  if (variant === 'link') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`text-sm text-foreground/60 hover:text-foreground/80 transition-colors ${className || ''}`}
      >
        Report
      </button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      className={className}
    >
      <WarningMicroSVG
        className="size-4"
      />
      Report
    </Button>
  );
}
