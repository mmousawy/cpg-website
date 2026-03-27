'use client';

import { useEffect, useRef, useState } from 'react';

import { scrollToIdWithStickyHeaderOffset } from '@/utils/scrollWithStickyHeader';

type HelpAccordionProps = {
  id: string;
  title: string;
  children: React.ReactNode;
};

export default function HelpAccordion({ id, title, children }: HelpAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Open accordion when navigating to this section via hash (e.g. /help#upload-photos)
  useEffect(() => {
    const openIfMatching = () => {
      if (window.location.hash === `#${id}`) {
        setIsOpen(true);
      }
    };
    openIfMatching();
    window.addEventListener('hashchange', openIfMatching);
    return () => window.removeEventListener('hashchange', openIfMatching);
  }, [id]);
  const [height, setHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    const el = contentRef.current;
    const updateHeight = () => setHeight(el.scrollHeight);
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  // Re-scroll after opening so layout matches sticky header offset (help deep links).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isOpen) return;
    if (window.location.hash !== `#${id}`) return;
    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) scrollToIdWithStickyHeaderOffset(id);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, id]);

  return (
    <div
      id={id}
      className="border-b border-border-color last:border-b-0 last:pb-0"
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-semibold text-primary dark:text-primary-light transition-colors hover:text-primary/90 dark:hover:text-primary-light/90"
        aria-expanded={isOpen}
      >
        <span>
          {title}
        </span>
        <span
          className={`shrink-0 text-primary/70 dark:text-primary-light/80 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`}
        >
          <svg
            className="size-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>
      <div
        className="overflow-hidden transition-[height] duration-300 ease-out"
        style={{ height: isOpen ? height : 0 }}
      >
        <div
          ref={contentRef}
          className="pb-6 pl-0 text-foreground/80 [&_ul]:mb-4 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ol]:mb-4 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1.5"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
