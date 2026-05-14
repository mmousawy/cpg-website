'use client';

import { useState } from 'react';
import Link from 'next/link';
import Popover from '@/components/shared/Popover';
import { useAdmin } from '@/hooks/useAdmin';

import EditMiniSVG from 'public/icons/edit-mini.svg';

type EventAdminActionsDropdownProps = {
  eventSlug: string;
};

export default function EventAdminActionsDropdown({ eventSlug }: EventAdminActionsDropdownProps) {
  const { isAdmin } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAdmin) return null;

  const menuItemClass =
    'flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground';

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
          aria-label="Admin actions"
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
      <div>
        <Link
          href={`/admin/events/${eventSlug}`}
          className={menuItemClass}
          onClick={() => setIsOpen(false)}
        >
          <EditMiniSVG
            className="size-4 shrink-0"
          />
          <span>
            Edit event
          </span>
        </Link>
      </div>
    </Popover>
  );
}
