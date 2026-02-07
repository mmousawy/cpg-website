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
    <div
      className="absolute right-0 top-0 mt-1"
    >
      <Popover
        align="right"
        width="w-48"
        open={isOpen}
        onOpenChange={setIsOpen}
        trigger={
          <button
            type="button"
            className="flex rounded-full border border-border-color-strong bg-background-medium dark:bg-[#2e3032] size-7 text-foreground/60 hover:border-primary hover:bg-primary/5 hover:text-foreground transition-colors"
            aria-label="More actions"
          >
            <svg
              className="size-4 m-auto"
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
    </div>
  );
}
