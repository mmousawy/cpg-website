'use client';

import Link from 'next/link';

import Container from '@/components/layout/Container';
import type { FAQSection } from '@/content/help/types';
import { useHelpScroll } from '@/context/HelpScrollContext';

interface HelpSidebarProps {
  sections: FAQSection[];
}

export default function HelpSidebar({ sections }: HelpSidebarProps) {
  const { activeSectionId, pinSection } = useHelpScroll();

  return (
    <aside
      className="hidden md:block shrink-0 md:w-50"
    >
      <div
        className="sticky top-24"
      >
        <Container
          padding="sm"
          variant="default"
          className="rounded-lg!"
        >
          <nav
            aria-label="Help sections"
          >
            <ul
              className="space-y-1 text-sm"
            >
              {sections.map((section) => {
                const isActive = section.id === activeSectionId;
                return (
                  <li
                    key={section.id}
                  >
                    <Link
                      href={`#${section.id}`}
                      onClick={() => pinSection(section.id)}
                      className={`block rounded-md px-2 py-1.5 ${
                        isActive
                          ? 'bg-primary/10 text-primary font-semibold shadow-[inset_0_0_0_1px_#38786052] dark:shadow-[inset_0_0_0_1px_#ededed1c]'
                          : 'text-foreground/80 hover:bg-background-medium hover:text-foreground'
                      }`}
                    >
                      {section.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </Container>
      </div>
    </aside>
  );
}
