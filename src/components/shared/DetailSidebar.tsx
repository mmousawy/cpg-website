import clsx from 'clsx';
import type { ReactNode } from 'react';

type DetailSidebarProps = {
  children: ReactNode;
  /** Overflow menu pinned to the top-right corner */
  actions?: ReactNode;
  /** Tighter top margin when stacked under a filmstrip/photo (mobile) */
  tightTopMargin?: boolean;
  /**
   * Stick to the viewport and fill the desktop column.
   * Use on album pages where the grid scrolls with the page.
   */
  sticky?: boolean;
  className?: string;
};

/**
 * Shared chrome for photo/album detail sidebars.
 * Inner spacing matches the photo detail page: author, title, meta, then likes/comments.
 */
export default function DetailSidebar({
  children,
  actions,
  tightTopMargin = false,
  sticky = false,
  className,
}: DetailSidebarProps) {
  return (
    <div
      className={clsx(
        'relative -mx-4 border-t border-t-border-color bg-background-light px-4 pt-4 sm:pb-8',
        'md:mx-0 md:mt-0 md:flex md:w-96 md:shrink-0 md:flex-col md:rounded-lg md:border md:border-border-color md:px-6 md:pt-6 md:pb-6',
        'lg:w-lg',
        tightTopMargin ? 'mt-2' : 'mt-4',
        sticky && 'md:sticky md:top-22.5 md:h-[calc(100vh-106px)] md:self-start md:overflow-y-auto lg:top-[106px] lg:h-[calc(100vh-138px)]',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 bottom-0 z-10 h-50 bg-linear-to-b from-transparent to-background md:hidden"
      />
      {actions ? (
        <div
          className="absolute right-4 top-4 md:right-6 md:top-6"
        >
          {actions}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function DetailSidebarAuthor({ children }: { children: ReactNode }) {
  return (
    <div
      className="mb-3"
    >
      {children}
    </div>
  );
}

export function DetailSidebarTitle({
  title,
  description,
}: {
  title?: ReactNode;
  description?: string | null;
}) {
  if (!title && !description) return null;

  return (
    <div
      className="mb-6"
    >
      {title ? (
        <h1
          className="mb-3 text-2xl font-bold md:text-xl font-heading"
        >
          {title}
        </h1>
      ) : null}
      {description ? (
        <p
          className="whitespace-pre-wrap text-base opacity-80 md:text-sm"
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function DetailSidebarMeta({ children }: { children: ReactNode }) {
  return (
    <div
      className="mt-auto space-y-2 pt-4"
    >
      {children}
    </div>
  );
}

export function DetailSidebarFooter({ children }: { children: ReactNode }) {
  return (
    <div
      className="mt-5 space-y-3 border-t border-border-color pt-5 relative z-10"
    >
      {children}
    </div>
  );
}
