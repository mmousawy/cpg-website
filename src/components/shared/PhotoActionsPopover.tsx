'use client';

import { useState } from 'react';
import Popover from '@/components/shared/Popover';
import PhotoActionsMenu from '@/components/shared/PhotoActionsMenu';

type PhotoActionsPopoverProps = {
  photoId: string;
  photoTitle: string | null;
  photoUserId: string | null;
};

export default function PhotoActionsPopover({ photoId, photoTitle, photoUserId }: PhotoActionsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      align="right"
      width="w-48"
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <button
          type="button"
          className="flex items-center justify-center rounded-full border border-border-color-strong bg-background-medium dark:bg-[#2e3032] size-6 text-foreground/60 hover:border-primary hover:bg-primary/5 hover:text-foreground transition-colors"
          aria-label="More actions"
        >
          <svg
            className="size-4 shrink-0 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>
      }
    >
      <PhotoActionsMenu
        photoId={photoId}
        photoTitle={photoTitle}
        photoUserId={photoUserId}
        onActionClick={() => setIsOpen(false)}
      />
    </Popover>
  );
}
