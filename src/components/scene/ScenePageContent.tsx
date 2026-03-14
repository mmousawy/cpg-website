'use client';

import type { SceneEventInterested } from '@/lib/data/scene';
import type { SceneEvent } from '@/types/scene';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

const EMPTY_STATE_EMOTES = [
  '(っ °Д °;)',
  'っ⊙﹏⊙∥',
  '(´。＿。｀)',
  '(；′⌒`)',
  '(≧﹏ ≦)',
  '(。﹏。*)',
  'ಥ_ಥ',
] as const;

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function RandomEmptyEmote() {
  const id = useId();
  const emote = useMemo(
    () =>
      EMPTY_STATE_EMOTES[
        hashString(id) % EMPTY_STATE_EMOTES.length
      ] as (typeof EMPTY_STATE_EMOTES)[number],
    [id],
  );
  return (
    <p
      className="font-sans text-2xl mb-2"
    >
      {emote}
    </p>
  );
}


import PastSceneEventsPaginated from './PastSceneEventsPaginated';
import SceneCategoryFilter from './SceneCategoryFilter';
import SceneEventCard from './SceneEventCard';

const ITEMS_PER_PAGE = 20;

function UpcomingScrollSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const savedOnVisible = useCallback(() => { onVisible(); }, [onVisible]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) savedOnVisible();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [savedOnVisible]);

  return (
    <div
      ref={ref}
      className="h-1"
    />
  );
}

type ScenePageContentProps = {
  upcomingEvents: SceneEvent[];
  initialPastEvents: SceneEvent[];
  pastTotalCount: number;
  pastPerPage: number;
  /** CPG past events (not from DB) — needed for correct pagination offset */
  cpgPastCount?: number;
  interestedByEvent?: Record<string, SceneEventInterested[]>;
};

type TabId = 'thisWeek' | 'nextWeek' | 'thisMonth' | 'ongoing' | 'later' | 'past';

const UPCOMING_TABS: { id: TabId; label: string }[] = [
  { id: 'thisWeek', label: 'This week' },
  { id: 'nextWeek', label: 'Next week' },
  { id: 'thisMonth', label: 'This month' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'later', label: 'Later' },
];

const PAST_TAB = { id: 'past' as const, label: 'Past' };

/** Week = Monday–Sunday. This week = current Mon–Sun, Next week = next Mon–Sun, This month = today–end of month. */
function groupUpcomingByPeriod(
  events: SceneEvent[],
  category: string | null,
): { thisWeek: SceneEvent[]; nextWeek: SceneEvent[]; thisMonth: SceneEvent[]; ongoing: SceneEvent[]; later: SceneEvent[] } {
  const filtered =
    category && category !== 'all'
      ? events.filter((e) => e.category === category)
      : events;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // This week: Monday – Sunday
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + mondayOffset);
  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);
  const thisWeekStart = thisMonday.toISOString().slice(0, 10);
  const thisWeekEnd = thisSunday.toISOString().slice(0, 10);

  // Next week: next Monday – next Sunday
  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(thisMonday.getDate() + 7);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  const nextWeekStart = nextMonday.toISOString().slice(0, 10);
  const nextWeekEnd = nextSunday.toISOString().slice(0, 10);

  // This month: today – end of month
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const endOfMonthStr = endOfMonth.toISOString().slice(0, 10);

  const thisWeek: SceneEvent[] = [];
  const nextWeek: SceneEvent[] = [];
  const thisMonth: SceneEvent[] = [];
  const ongoing: SceneEvent[] = [];
  const later: SceneEvent[] = [];

  for (const e of filtered) {
    const start = e.start_date;
    if (start < todayStr && e.end_date != null && e.end_date >= todayStr) {
      ongoing.push(e);
    } else if (start >= thisWeekStart && start <= thisWeekEnd) {
      thisWeek.push(e);
      if (start >= todayStr && start <= endOfMonthStr) thisMonth.push(e);
    } else if (start >= nextWeekStart && start <= nextWeekEnd) {
      nextWeek.push(e);
      if (start >= todayStr && start <= endOfMonthStr) thisMonth.push(e);
    } else if (start >= todayStr && start <= endOfMonthStr) {
      thisMonth.push(e);
    } else {
      later.push(e);
    }
  }

  return { thisWeek, nextWeek, thisMonth, ongoing, later };
}

export default function ScenePageContent({
  upcomingEvents,
  initialPastEvents,
  pastTotalCount,
  pastPerPage,
  cpgPastCount = 0,
  interestedByEvent = {},
}: ScenePageContentProps) {
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const [pastCountByCategory, setPastCountByCategory] = useState<
    Record<string, number>
  >({});

  // Immediate fallback: count from first batch (sync, no API delay)
  const filteredInitialPastCount = useMemo(
    () =>
      category && category !== 'all'
        ? initialPastEvents.filter((e) => e.category === category).length
        : 0,
    [initialPastEvents, category],
  );

  // Fetch category-specific past count when category is active (for tab badge)
  useEffect(() => {
    if (!category || category === 'all') return;
    if (pastCountByCategory[category] !== undefined) return; // Cached
    let cancelled = false;
    const params = new URLSearchParams({
      offset: '0',
      limit: '1',
      category,
    });
    fetch(`/api/scene/past?${params}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed'))))
      .then((data: { totalCount?: number }) => {
        if (cancelled) return;
        const dbCount = data.totalCount ?? 0;
        const cpgInCategory = initialPastEvents.filter(
          (e) => e.id.startsWith('cpg-') && e.category === category,
        ).length;
        setPastCountByCategory((prev) => ({
          ...prev,
          [category]: dbCount + cpgInCategory,
        }));
      })
      .catch(() => {
        if (!cancelled)
          setPastCountByCategory((prev) => ({ ...prev, [category]: 0 }));
      });
    return () => {
      cancelled = true;
    };
  }, [category, initialPastEvents, pastCountByCategory]);

  const { thisWeek, nextWeek, thisMonth, ongoing, later } = useMemo(
    () => groupUpcomingByPeriod(upcomingEvents, category),
    [upcomingEvents, category],
  );

  const pastCount =
    category && category !== 'all'
      ? (pastCountByCategory[category] ?? filteredInitialPastCount)
      : pastTotalCount + cpgPastCount;

  const counts = useMemo(
    () => ({
      thisWeek: thisWeek.length,
      nextWeek: nextWeek.length,
      thisMonth: thisMonth.length,
      ongoing: ongoing.length,
      later: later.length,
      past: pastCount,
    }),
    [
      thisWeek.length,
      nextWeek.length,
      thisMonth.length,
      ongoing.length,
      later.length,
      pastCount,
    ],
  );

  const availableTabs = useMemo(() => {
    const upcoming = UPCOMING_TABS.filter((t) => counts[t.id] > 0);
    const past = pastCount > 0 ? [PAST_TAB] : [];
    return [...upcoming, ...past];
  }, [counts, pastCount]);

  const defaultTab = availableTabs.length > 0 ? availableTabs[0].id : null;
  const [selectedTab, setSelectedTab] = useState<TabId | null>(defaultTab);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [lastCategory, setLastCategory] = useState(category);

  let activeSelectedTab = selectedTab;
  if (category !== lastCategory) {
    setLastCategory(category);
    setSelectedTab(null);
    setVisibleCount(ITEMS_PER_PAGE);
    activeSelectedTab = null;
  }

  const activeTab = activeSelectedTab && availableTabs.some((t) => t.id === activeSelectedTab)
    ? activeSelectedTab
    : defaultTab;

  const handleTabChange = (tabId: TabId) => {
    setSelectedTab(tabId);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const hasUpcoming =
    thisWeek.length > 0 || nextWeek.length > 0 || ongoing.length > 0 || thisMonth.length > 0 || later.length > 0;
  const hasPast = pastCount > 0;
  const hasAnyEvents = hasUpcoming || hasPast;

  const activeEvents =
    activeTab === 'thisWeek'
      ? thisWeek
      : activeTab === 'nextWeek'
        ? nextWeek
        : activeTab === 'thisMonth'
          ? thisMonth
          : activeTab === 'ongoing'
            ? ongoing
            : activeTab === 'later'
              ? later
              : [];

  return (
    <div
      className="space-y-10"
    >
      {/* Category filter */}
      <SceneCategoryFilter />

      {/* Empty state */}
      {!hasAnyEvents && (
        <div
          key={category ?? 'all'}
          className="text-center py-16 rounded-xl border-2 border-dashed border-border-color bg-background/50"
        >
          <RandomEmptyEmote />
          <p
            className="text-lg font-medium text-foreground/90 mb-2"
          >
            This category is empty
          </p>
          <p
            className="text-foreground/70 max-w-md mx-auto"
          >
            Be the first to add an event.
          </p>
        </div>
      )}

      {/* Tabs + content */}
      {hasAnyEvents && (
        <section>
          <div
            className="flex gap-1 mb-4 border-b border-border-color pb-2 overflow-x-auto scrollbar-none"
          >
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary border-2 bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary-alt'
                    : 'border-transparent border-2 text-foreground/70 hover:text-foreground hover:bg-foreground/5 dark:text-foreground/90 dark:hover:text-foreground dark:hover:bg-foreground/10'
                }`}
              >
                {tab.label}
                <span
                  className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold leading-none ${
                    activeTab === tab.id
                      ? 'bg-primary/15 text-primary dark:bg-primary/40 dark:text-primary-alt'
                      : 'bg-foreground/10 text-foreground/60 dark:bg-foreground/15 dark:text-foreground/70'
                  }`}
                >
                  {counts[tab.id]}
                </span>
              </button>
            ))}
          </div>

          {activeTab === 'past' ? (
            <PastSceneEventsPaginated
              initialEvents={initialPastEvents}
              initialInterestedByEvent={interestedByEvent}
              totalCount={pastTotalCount}
              perPage={pastPerPage}
              category={category}
            />
          ) : activeTab ? (
            activeEvents.length > 0 ? (
              <>
                <div
                  className="grid gap-4 sm:gap-6"
                >
                  {activeEvents.slice(0, visibleCount).map((event) => (
                    <SceneEventCard
                      key={event.id}
                      event={event}
                      interested={interestedByEvent[event.id] ?? []}
                    />
                  ))}
                </div>
                {activeEvents.length > visibleCount && (
                  <UpcomingScrollSentinel
                    onVisible={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                  />
                )}
              </>
            ) : (
              <div
                className="text-center py-8 rounded-xl border border-dashed border-border-color"
              >
                <p
                  className="text-foreground/80"
                >
                  No events in this tab. Check back soon or add one!
                </p>
              </div>
            )
          ) : null}
        </section>
      )}
    </div>
  );
}
