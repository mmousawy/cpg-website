'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import DevWorkbenchCheckboxField from '@/dev/workbench/DevWorkbenchCheckboxField';
import DevWorkbenchChevron from '@/dev/workbench/DevWorkbenchChevron';
import DevWorkbenchDisclosure from '@/dev/workbench/DevWorkbenchDisclosure';
import DevWorkbenchNavItemLink from '@/dev/workbench/DevWorkbenchNavItemLink';
import DevWorkbenchNavMarker from '@/dev/workbench/DevWorkbenchNavMarker';
import DevWorkbenchSearchInput from '@/dev/workbench/DevWorkbenchSearchInput';
import DevWorkbenchSidebar from '@/dev/workbench/DevWorkbenchSidebar';
import { devWorkbenchNavLinkClass } from '@/dev/workbench/devWorkbenchNavLinkClass';

import type { UiComponentGroup } from './componentCatalog';
import { componentHasStories } from './storyFrames';
import { notifyStoryboardHashChange } from './storyboardHash';
import { setStoryboardLocationHash } from './scrollStoryboardTarget';
import { getStoryboardSubcategories, type StoryboardSubcategory } from './subcategories';
import { useStoryboardHash } from './useStoryboardHash';

type StoryboardSidebarProps = {
  groups: UiComponentGroup[];
  activeGroupId: string;
  activeSlug: string;
};

function matchesQuery(text: string, query: string) {
  return text.toLowerCase().includes(query);
}

function filterSubcategoryComponents(
  groupId: string,
  sub: StoryboardSubcategory,
  storiesOnly: boolean,
  normalizedQuery: string,
) {
  return sub.componentNames.filter((name) => {
    if (storiesOnly && !componentHasStories(groupId, name)) {
      return false;
    }
    if (!normalizedQuery) return true;
    return matchesQuery(name, normalizedQuery) || matchesQuery(sub.label, normalizedQuery);
  });
}

export default function StoryboardSidebar({
  groups,
  activeGroupId,
  activeSlug,
}: StoryboardSidebarProps) {
  const pathname = usePathname();
  const hash = useStoryboardHash();
  const [query, setQuery] = useState('');
  const [storiesOnly, setStoriesOnly] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openSubcategories, setOpenSubcategories] = useState<Record<string, boolean>>({});

  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    void (async () => {
      if (activeGroupId) {
        setOpenGroups((prev) => (prev[activeGroupId] ? prev : { ...prev, [activeGroupId]: true }));
      }
    })();
  }, [activeGroupId]);

  useEffect(() => {
    void (async () => {
      if (activeGroupId && activeSlug) {
        const key = `${activeGroupId}/${activeSlug}`;
        setOpenSubcategories((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
      }
    })();
  }, [activeGroupId, activeSlug]);

  const filteredGroups = useMemo(() => {
    return groups
      .map((group) => {
        const subs = getStoryboardSubcategories(group.id);
        if (subs.length > 0) {
          const subcategories = subs
            .map((sub) => ({
              sub,
              components: filterSubcategoryComponents(group.id, sub, storiesOnly, normalizedQuery),
            }))
            .filter(({ sub, components }) => {
              if (components.length > 0) return true;
              if (!storiesOnly && normalizedQuery) {
                return matchesQuery(sub.label, normalizedQuery);
              }
              return false;
            });
          return { ...group, subcategories, entries: [] as UiComponentGroup['entries'] };
        }

        const entries = group.entries.filter((entry) => {
          if (storiesOnly && !componentHasStories(group.id, entry.name)) {
            return false;
          }
          if (!normalizedQuery) return true;
          const haystack = `${group.id}/${entry.name} ${entry.path}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        });
        return { ...group, subcategories: [] as Array<{ sub: StoryboardSubcategory; components: string[] }>, entries };
      })
      .filter((group) => group.subcategories.length > 0 || group.entries.length > 0);
  }, [groups, normalizedQuery, storiesOnly]);

  return (
    <DevWorkbenchSidebar
      ariaLabel="Components"
      toolbar={(
        <>
          <DevWorkbenchSearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search components…"
            label="Search components"
          />
          <DevWorkbenchCheckboxField
            checked={storiesOnly}
            onChange={setStoriesOnly}
            label="Only components with stories"
          />
        </>
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
            </button>
            <DevWorkbenchDisclosure
              open={isGroupOpen}
              className="mb-2 mt-0.5"
              innerClassName="border-l border-border-color/80 pl-2 ml-2"
            >
              <div
                className="space-y-1 pt-0.5"
              >
                {group.subcategories.length > 0
                  ? group.subcategories.map(({ sub, components }) => {
                    const subKey = `${group.id}/${sub.id}`;
                    const defaultSubOpen =
                      (group.id === activeGroupId && sub.id === activeSlug)
                      || Boolean(normalizedQuery);
                    const isSubOpen = openSubcategories[subKey] ?? defaultSubOpen;
                    const isSubActive =
                      group.id === activeGroupId && sub.id === activeSlug;
                    return (
                      <div
                        key={sub.id}
                        className="space-y-0.5"
                      >
                        <div
                          className="flex items-stretch gap-0.5"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenSubcategories((prev) => ({
                                ...prev,
                                [subKey]: !isSubOpen,
                              }));
                            }}
                            className="flex shrink-0 items-center justify-center rounded-md px-1 py-1.5 text-foreground/60 hover:bg-background"
                            aria-expanded={isSubOpen}
                            aria-label={isSubOpen ? `Collapse ${sub.label}` : `Expand ${sub.label}`}
                          >
                            <DevWorkbenchChevron
                              open={isSubOpen}
                              sizeClass="size-3"
                            />
                          </button>
                          <Link
                            href={`/dev/ui/${group.id}/${sub.id}`}
                            scroll={false}
                            className={clsx(
                              'sticky top-8 z-10 min-w-0 flex-1 pr-2 pl-0.5 font-medium',
                              devWorkbenchNavLinkClass(isSubActive && !hash, 'sans'),
                              !isSubActive || hash ? 'text-foreground/85' : null,
                            )}
                          >
                            <DevWorkbenchNavMarker
                              active={isSubActive && !hash}
                            />
                            <span
                              className="truncate"
                            >
                              {sub.label}
                            </span>
                            <span
                              className="ml-auto shrink-0 text-xs font-normal text-foreground/40"
                            >
                              {components.length}
                            </span>
                          </Link>
                        </div>
                        <DevWorkbenchDisclosure
                          open={isSubOpen}
                          innerClassName="border-l border-border-color/60 pl-2 ml-3"
                        >
                          <ul
                            className="space-y-0.5 pt-0.5"
                          >
                            {components.map((componentName) => {
                              const isActive =
                                isSubActive && hash === componentName;
                              const basePath = `/dev/ui/${group.id}/${sub.id}`;
                              return (
                                <li
                                  key={componentName}
                                >
                                  <DevWorkbenchNavItemLink
                                    href={`${basePath}#${componentName}`}
                                    scroll={false}
                                    active={isActive}
                                    variant="mono"
                                    onClick={(e) => {
                                      if (pathname !== basePath) {
                                        requestAnimationFrame(notifyStoryboardHashChange);
                                        return;
                                      }
                                      e.preventDefault();
                                      const changed = setStoryboardLocationHash(basePath, componentName);
                                      if (!changed) {
                                        document.dispatchEvent(
                                          new CustomEvent('storyboard-scroll-to', {
                                            detail: { id: componentName },
                                          }),
                                        );
                                      }
                                    }}
                                  >
                                    <span
                                      className="truncate"
                                    >
                                      {componentName}
                                    </span>
                                  </DevWorkbenchNavItemLink>
                                </li>
                              );
                            })}
                          </ul>
                        </DevWorkbenchDisclosure>
                      </div>
                    );
                  })
                  : (
                    <ul
                      className="space-y-0.5 pl-1"
                    >
                      {group.entries.map((entry) => {
                        const href = `/dev/ui/${group.id}/${entry.name}`;
                        const isActive =
                          group.id === activeGroupId && entry.name === activeSlug;
                        return (
                          <li
                            key={entry.path}
                          >
                            <DevWorkbenchNavItemLink
                              href={href}
                              scroll={false}
                              active={isActive}
                              variant="mono"
                              className="text-sm"
                            >
                              <span
                                className="min-w-0 truncate"
                              >
                                {entry.name}
                              </span>
                            </DevWorkbenchNavItemLink>
                          </li>
                        );
                      })}
                    </ul>
                  )}
              </div>
            </DevWorkbenchDisclosure>
          </section>
        );
      })}
    </DevWorkbenchSidebar>
  );
}
