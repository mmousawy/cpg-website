'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import DevWorkbenchChevron from '@/dev/workbench/DevWorkbenchChevron';
import DevWorkbenchDisclosure from '@/dev/workbench/DevWorkbenchDisclosure';
import DevWorkbenchNavItemLink from '@/dev/workbench/DevWorkbenchNavItemLink';
import DevWorkbenchSearchInput from '@/dev/workbench/DevWorkbenchSearchInput';
import DevWorkbenchSidebar from '@/dev/workbench/DevWorkbenchSidebar';

import {
  emailPreviewGroups,
  getActiveEmailPreviewGroupId,
} from './emailPreviewGroups';

function parseActiveTemplateSlug(pathname: string): string {
  const match = /^\/email\/([^/]+)\/?$/.exec(pathname);
  return match?.[1] ?? '';
}

function matchesQuery(text: string, query: string) {
  return text.toLowerCase().includes(query);
}

export default function EmailPreviewSidebar() {
  const pathname = usePathname();
  const activeSlug = parseActiveTemplateSlug(pathname);
  const activeGroupId = getActiveEmailPreviewGroupId(activeSlug);

  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (activeGroupId) {
      setOpenGroups((prev) => (prev[activeGroupId] ? prev : { ...prev, [activeGroupId]: true }));
    }
  }, [activeGroupId]);

  const filteredGroups = useMemo(() => {
    return emailPreviewGroups
      .map((group) => {
        const slugs = group.slugs.filter((slug) => {
          if (!normalizedQuery) return true;
          return (
            matchesQuery(slug, normalizedQuery)
            || matchesQuery(group.label, normalizedQuery)
          );
        });
        return { ...group, slugs };
      })
      .filter((group) => group.slugs.length > 0);
  }, [normalizedQuery]);

  return (
    <DevWorkbenchSidebar
      ariaLabel="Email templates"
      toolbar={(
        <DevWorkbenchSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search templates…"
          label="Search email templates"
        />
      )}
    >
      {filteredGroups.map((group) => {
        const defaultOpen =
          group.id === activeGroupId
          || Boolean(normalizedQuery);
        const isGroupOpen = openGroups[group.id] ?? defaultOpen;
        return (
          <section
            key={group.id}
            className="mb-1"
          >
            <button
              type="button"
              onClick={() => {
                setOpenGroups((prev) => ({ ...prev, [group.id]: !isGroupOpen }));
              }}
              className="sticky top-0 z-20 flex w-full cursor-pointer items-center gap-1.5 rounded-md border-b border-transparent bg-background-light px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-foreground/60 hover:bg-background"
              aria-expanded={isGroupOpen}
            >
              <DevWorkbenchChevron
                open={isGroupOpen}
              />
              <span
                className="min-w-0 truncate"
              >
                {group.label}
              </span>
              <span
                className="ml-auto shrink-0 text-[10px] font-normal text-foreground/40"
              >
                {group.slugs.length}
              </span>
            </button>
            <DevWorkbenchDisclosure
              open={isGroupOpen}
              className="mb-2 mt-0.5"
              innerClassName="border-l border-border-color/80 pl-2 ml-2"
            >
              <ul
                className="space-y-0.5 pt-0.5"
              >
                {group.slugs.map((slug) => {
                  const isActive = activeSlug === slug;
                  return (
                    <li
                      key={slug}
                    >
                      <DevWorkbenchNavItemLink
                        href={`/email/${slug}`}
                        scroll={false}
                        active={isActive}
                        variant="mono"
                      >
                        <span
                          className="truncate"
                        >
                          {slug}
                        </span>
                      </DevWorkbenchNavItemLink>
                    </li>
                  );
                })}
              </ul>
            </DevWorkbenchDisclosure>
          </section>
        );
      })}
    </DevWorkbenchSidebar>
  );
}
