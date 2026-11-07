'use client';

import { useState } from 'react';
import Link from 'next/link';

import Popover from '@/components/shared/Popover';
import QuestionMarkCircleSVG from 'public/icons/question-mark-circle.svg';

const sizeMap = {
  sm: { wrapper: 'size-5 ml-1', icon: 'size-4' },
  md: { wrapper: 'size-5 ml-1', icon: 'size-4.5' },
  lg: { wrapper: 'ml-0.5 mt-1', icon: 'size-5.5' },
};

const menuItemClass =
  'flex w-full items-center px-3 py-2 text-left text-sm text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground';

type ManageHelpMenuProps = {
  id?: string;
  helpHref: string;
  helpLabel: string;
  size?: keyof typeof sizeMap;
  onShowGuide?: () => void;
  showGuideHref?: string;
};

export default function ManageHelpMenu({
  id,
  helpHref,
  helpLabel,
  size = 'sm',
  onShowGuide,
  showGuideHref,
}: ManageHelpMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const resolvedHelpHref = helpHref.startsWith('/') ? helpHref : `/help#${helpHref}`;
  const { wrapper, icon } = sizeMap[size];

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
          title="Help"
          className={`inline-flex ${wrapper} shrink-0 items-center justify-center rounded-full text-foreground/50 transition-colors hover:text-primary`}
        >
          <span
            className="sr-only"
          >
            Help
          </span>
          <QuestionMarkCircleSVG
            className={`inline ${icon}`}
            aria-hidden
          />
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
