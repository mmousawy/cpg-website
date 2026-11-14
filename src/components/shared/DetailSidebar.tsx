import clsx from 'clsx';
import type { ReactNode } from 'react';
import MentionText from './MentionText';

type DetailSidebarProps = {
  children: ReactNode;
  /** Accessible name for the complementary column (photo/album details). */
  ariaLabel?: string;
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
  ariaLabel = 'Details',
  actions,
  tightTopMargin = false,
  sticky = false,
  className,
}: DetailSidebarProps) {
  return (
    <aside
      aria-label={ariaLabel}
      className={clsx(
        'relative -mx-4 border-t border-t-border-color bg-background-light px-4 pt-4 sm:pb-8',
        'md:mx-0 md:mt-0 md:flex md:w-96 md:shrink-0 md:flex-col md:rounded-lg md:border md:border-border-color md:px-6 md:pt-6 md:pb-6',
        'lg:w-lg',
        tightTopMargin ? 'mt-2' : 'mt-3',
        sticky && 'md:sticky md:top-22.5 md:h-[calc(100vh-106px)] md:self-start md:overflow-y-auto lg:top-[106px] lg:h-[calc(100vh-138px)]',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 bottom-0 z-0 h-50 bg-linear-to-b from-transparent to-background md:hidden"
      />
      {actions ? (
        <div
          className="absolute right-4 top-4 z-10 md:right-6 md:top-6"
        >
          {actions}
        </div>
      ) : null}
      <div
        className="relative z-5 flex min-h-0 flex-1 flex-col"
      >
        {children}
      </div>
    </aside>
  );
}

/** Secondary section title in detail sidebars (Tagged people, Seen in, etc.). */
export function DetailSidebarSectionHeading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={clsx('mb-1.5 text-xs font-medium text-foreground/80', className)}
    >
      {children}
    </h2>
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
  accessibleTitle,
  description,
  authorId,
}: {
  /** Visible page title (e.g. photo title when the uploader set one). */
  title?: ReactNode;
  /** h1 text when `title` is omitted — shown to assistive tech only (e.g. untitled photos). */
  accessibleTitle?: string;
  description?: string | null;
  authorId?: string | null;
}) {
  const displayTitle =
    title !== undefined && title !== null && String(title).trim() !== ''
      ? title
      : null;
  const h1Text = displayTitle ?? accessibleTitle?.trim();
  const hasDescription = Boolean(description?.trim());
  if (!h1Text && !hasDescription) return null;

  const hasVisibleBlock = Boolean(displayTitle) || hasDescription;

  return (
    <div
      className={clsx(hasVisibleBlock && 'mb-6')}
    >
      {h1Text ? (
        <h1
          className={clsx(
            'font-heading',
            displayTitle
              ? 'mb-3 text-2xl font-bold md:text-xl'
              : 'sr-only',
          )}
        >
          {h1Text}
        </h1>
      ) : null}
      {description ? (
        <p
          className="whitespace-pre-wrap text-base opacity-80 md:text-sm"
        >
          <MentionText
            text={description}
            authorId={authorId}
          />
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
      className="space-y-3 pt-5"
    >
      <div
        className="mb-5 border-t border-border-color"
      />
      {children}
    </div>
  );
}
