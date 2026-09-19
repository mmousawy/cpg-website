'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  mobileFloatingPillClassName,
  mobileFloatingPillInsetClassName,
  mobileStickyChromeZClassName,
} from '@/components/layout/mobileChrome';
import type { SectionNavItem } from '@/components/shared/SectionSidebar';
import { useSectionScroll } from '@/context/SectionScrollContext';
import { useReportMobileStickyChromeHeight } from '@/hooks/useReportMobileStickyChromeHeight';
import { scrollToIdWithStickyHeaderOffset } from '@/utils/scrollWithStickyHeader';
import TocSVG from 'public/icons/toc.svg';

interface SectionMobileNavProps {
  sections: SectionNavItem[];
  ariaLabel?: string;
  /** Set false when rendered inside a parent that already handles sticky positioning */
  sticky?: boolean;
}

export default function SectionMobileNav({ sections, ariaLabel = 'Page sections', sticky = true }: SectionMobileNavProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useReportMobileStickyChromeHeight(panelRef, sticky);
  const { activeSectionId, pinSection } = useSectionScroll();
  const activeSection = sections.find((s) => s.id === activeSectionId);

  const close = useCallback(() => setIsExpanded(false), []);

  const handleSectionClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    pinSection(id);
    close();

    const didScroll = scrollToIdWithStickyHeaderOffset(id);
    if (!didScroll) return;

    event.preventDefault();
    window.history.replaceState(null, '', `#${id}`);
  }, [close, pinSection]);

  // Close when clicking outside
  useEffect(() => {
    if (!isExpanded) return;

    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        close();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isExpanded, close]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  return (
    <div
      ref={panelRef}
      className={clsx(
        'md:hidden flex flex-col',
        mobileStickyChromeZClassName,
        sticky && 'sticky bottom-0 max-sm:bottom-[var(--mobile-nav-offset,0px)]',
        sticky && mobileFloatingPillInsetClassName,
      )}
    >
      <div
        className={clsx('flex flex-col overflow-hidden', mobileFloatingPillClassName)}
      >
      {/* Collapsed trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="relative z-[2] flex items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Close sections' : 'Open sections'}
      >
        <span
          className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground"
        >
          <TocSVG
            className="size-5 shrink-0 fill-current text-foreground/70"
            aria-hidden
          />
          <span className="truncate">
            {activeSection ? activeSection.title : 'Jump to section'}
          </span>
        </span>
        <span
          className={`shrink-0 text-foreground/60 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
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
              d="M5 15l7-7 7 7"
            />
          </svg>
        </span>
      </button>

      {/* Expandable content */}
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: isExpanded ? 280 : 0 }}
      >
        <nav
          aria-label={ariaLabel}
          className="relative z-[2] border-t border-border-color overflow-y-auto overscroll-contain max-h-65"
        >
          <ul
            className="py-2"
          >
            {sections.map((section) => {
              const isActive = section.id === activeSectionId;
              return (
                <li
                  key={section.id}
                >
                  <Link
                    href={`#${section.id}`}
                    data-smooth-scroll="self-managed"
                    onClick={(event) => handleSectionClick(event, section.id)}
                    className={`block px-4 py-2.5 text-sm ${
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground/80 hover:bg-background-medium hover:text-foreground active:bg-background-medium'
                    }`}
                  >
                    {section.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      </div>
    </div>
  );
}
