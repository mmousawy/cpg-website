'use client';

import Popover from '@/components/shared/Popover';
import ProfileActionsMenu from '@/components/shared/ProfileActionsMenu';
import { useState } from 'react';

type ProfileActionsPopoverProps = {
  profileId: string;
  profileNickname: string;
};

export default function ProfileActionsPopover({ profileId, profileNickname }: ProfileActionsPopoverProps) {
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
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border-color bg-background-light transition-colors hover:border-primary hover:text-primary mt-1"
          aria-label="More actions"
        >
          <svg
            className="size-3.5 sm:size-4 m-auto"
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
      <ProfileActionsMenu
        profileId={profileId}
        profileNickname={profileNickname}
        onActionClick={() => setIsOpen(false)}
      />
    </Popover>
  );
}
