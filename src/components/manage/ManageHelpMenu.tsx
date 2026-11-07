'use client';

import { useState } from 'react';
import Link from 'next/link';

import Popover from '@/components/shared/Popover';
import QuestionMarkCircleSVG from 'public/icons/question-mark-circle.svg';

const menuItemClass =
  'flex w-full items-center px-3 py-2 text-left text-sm text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground';

type ManageHelpMenuProps = {
  id?: string;
  helpHref: string;
  helpLabel: string;
  onShowGuide?: () => void;
  showGuideHref?: string;
};

export default function ManageHelpMenu({
  id,
  helpHref,
  helpLabel,
  onShowGuide,
  showGuideHref,
}: ManageHelpMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const resolvedHelpHref = helpHref.startsWith('/') ? helpHref : `/help#${helpHref}`;

  const closeThen = (action: () => void) => {
    setIsOpen(false);
    requestAnimationFrame(action);
  };

  return (
    <Popover
      align="right"
      width="w-52"
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={(
        <span
          id={id}
          className="btn-skeuo btn-skeuo-secondary inline-flex items-center justify-center gap-2 rounded-md border border-border-color-strong bg-background-raised px-3 py-1.5 font-(family-name:--font-geist-mono) text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-[color-mix(in_srgb,var(--primary)_5%,var(--background))] dark:hover:bg-[color-mix(in_srgb,var(--primary)_8%,var(--background-raised))]"
        >
          <QuestionMarkCircleSVG
            className="block size-5 -ml-0.5"
            aria-hidden
          />
          <span
            className="sr-only lg:hidden"
          >
            Help
          </span>
          <span
            className="hidden lg:inline"
          >
            Help
          </span>
        </span>
      )}
    >
      <div
        className="py-1"
      >
        {onShowGuide ? (
          <button
            type="button"
            className={menuItemClass}
            onClick={() => closeThen(onShowGuide)}
          >
            Show guide
          </button>
        ) : showGuideHref ? (
          <Link
            href={showGuideHref}
            className={menuItemClass}
            onClick={() => setIsOpen(false)}
          >
            Show guide
          </Link>
        ) : null}
        <Link
          href={resolvedHelpHref}
          className={menuItemClass}
          onClick={() => setIsOpen(false)}
        >
          {helpLabel}
        </Link>
      </div>
    </Popover>
  );
}
