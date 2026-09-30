'use client';

import { RichDescriptionView } from '@/components/shared/RichDescriptionView';
import { prepareRichDescriptionContent } from '@/utils/richHtmlShared';
import clsx from 'clsx';
import ArrowRightFillSVG from 'public/icons/arrow-right-fill.svg';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

type ExpandableChallengePromptProps = {
  html: string;
  className?: string;
  disableLinks?: boolean;
  /** When false, only shows clamped rich text (no read more). */
  expandable?: boolean;
};

type PromptHeights = {
  collapsed: number;
  full: number;
};

export default function ExpandableChallengePrompt({
  html,
  className,
  disableLinks = false,
  expandable = true,
}: ExpandableChallengePromptProps) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<PromptHeights | null>(null);

  const sanitizedHtml = useMemo(() => {
    return prepareRichDescriptionContent(html, disableLinks)?.content ?? '';
  }, [html, disableLinks]);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el || !sanitizedHtml) return;

    el.classList.remove('line-clamp-3');
    const full = el.scrollHeight;
    el.classList.add('line-clamp-3');
    const collapsed = el.clientHeight;
    el.classList.remove('line-clamp-3');

    setHeights({ collapsed, full });
  }, [sanitizedHtml]);

  if (!sanitizedHtml) return null;

  if (!expandable) {
    return (
      <div
        className={className}
      >
        <RichDescriptionView
          html={sanitizedHtml}
          className="text-sm leading-snug text-foreground/75 line-clamp-3"
          disableLinks={disableLinks}
        />
      </div>
    );
  }

  const isTruncated = heights != null && heights.full > heights.collapsed + 1;
  const showToggle = isTruncated || expanded;

  return (
    <div
      className={className}
    >
      <div
        className={clsx(
          'overflow-hidden',
          heights && 'transition-[max-height] duration-300 ease-in-out',
        )}
        style={
          heights
            ? { maxHeight: expanded ? heights.full : heights.collapsed }
            : undefined
        }
      >
        <div
          ref={contentRef}
          className={clsx(!heights && !expanded && 'line-clamp-3')}
        >
          <RichDescriptionView
            html={sanitizedHtml}
            className="text-sm leading-snug text-foreground/75"
            disableLinks={disableLinks}
          />
        </div>
      </div>
      {showToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
        >
          <span
            className="inline-block mr-1"
          >
            {expanded ? 'Show less' : 'Show more'}
          </span>
          <ArrowRightFillSVG
            className={clsx(
              'size-3 shrink-0 fill-current transition-transform duration-300 ease-in-out',
              expanded ? '-rotate-90' : 'rotate-90',
            )}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  );
}
