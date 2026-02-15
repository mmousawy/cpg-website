'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { FAQSection } from '@/content/help/types';
import { useHelpScroll } from '@/context/HelpScrollContext';

interface HelpMobileNavProps {
  sections: FAQSection[];
}

export default function HelpMobileNav({ sections }: HelpMobileNavProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { activeSectionId, pinSection } = useHelpScroll();
  const activeSection = sections.find((s) => s.id === activeSectionId);

  const close = useCallback(() => setIsExpanded(false), []);

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
      className="md:hidden sticky bottom-0 z-30 flex flex-col border-t border-border-color-strong bg-background-light shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-[env(safe-area-inset-bottom)]"
    >
      {/* Collapsed trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Close sections' : 'Open sections'}
      >
        <span
          className="text-sm font-medium text-foreground"
        >
          {activeSection ? activeSection.title : 'Jump to section'}
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
          aria-label="Help sections"
          className="border-t border-border-color overflow-y-auto overscroll-contain max-h-[260px]"
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
                    onClick={() => {
                      pinSection(section.id);
                      close();
                    }}
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
  );
}
