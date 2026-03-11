'use client';

import type { SceneEventInterested } from '@/lib/data/scene';
import type { SceneEvent } from '@/types/scene';
import { useSearchParams } from 'next/navigation';
import { useId, useMemo } from 'react';

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
      className="text-2xl mb-2"
    >
      {emote}
    </p>
  );
}

import PastSceneEventsPaginated from './PastSceneEventsPaginated';
import SceneCategoryFilter from './SceneCategoryFilter';
import SceneEventCard from './SceneEventCard';

type ScenePageContentProps = {
  upcomingEvents: SceneEvent[];
  initialPastEvents: SceneEvent[];
  pastTotalCount: number;
  pastPerPage: number;
  interestedByEvent?: Record<string, SceneEventInterested[]>;
};

function groupUpcomingByPeriod(
  events: SceneEvent[],
  category: string | null,
): { thisWeek: SceneEvent[]; thisMonth: SceneEvent[]; later: SceneEvent[] } {
  const filtered =
    category && category !== 'all'
      ? events.filter((e) => e.category === category)
      : events;

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  const endOfMonth = new Date(now);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);

  const thisWeek: SceneEvent[] = [];
  const thisMonth: SceneEvent[] = [];
  const later: SceneEvent[] = [];

  for (const e of filtered) {
    const start = new Date(e.start_date);
    if (start <= endOfWeek) {
      thisWeek.push(e);
    } else if (start <= endOfMonth) {
      thisMonth.push(e);
    } else {
      later.push(e);
    }
  }

  return { thisWeek, thisMonth, later };
}

export default function ScenePageContent({
  upcomingEvents,
  initialPastEvents,
  pastTotalCount,
  pastPerPage,
  interestedByEvent = {},
}: ScenePageContentProps) {
  const searchParams = useSearchParams();
  const category = searchParams.get('category');

  const { thisWeek, thisMonth, later } = useMemo(
    () => groupUpcomingByPeriod(upcomingEvents, category),
    [upcomingEvents, category],
  );

  const hasUpcoming =
    thisWeek.length > 0 || thisMonth.length > 0 || later.length > 0;
  const upcomingCount = thisWeek.length + thisMonth.length + later.length;
  const hasAnyEvents = hasUpcoming || initialPastEvents.length > 0 || pastTotalCount > 0;

  return (
    <div
      className="space-y-10"
    >
      {/* Category filter */}
      <SceneCategoryFilter />

      {/* Empty state */}
      {!hasAnyEvents && (
        <div
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

      {/* Upcoming */}
      {hasAnyEvents && (
        <section>
          <h2
            className="text-lg font-semibold mb-4 opacity-70"
          >
            Upcoming
            {upcomingCount > 0 && (
              <span
                className="ml-2 text-base font-medium text-foreground/50"
              >
                (
                {upcomingCount}
                )
              </span>
            )}
          </h2>
          {!hasUpcoming ? (
            <div
              className="text-center py-8 rounded-xl border border-dashed border-border-color"
            >
              <p
                className="text-foreground/80"
              >
                No upcoming events in this category. Check back soon or add one!
              </p>
            </div>
          ) : (
            <div
              className="space-y-8"
            >
              {thisWeek.length > 0 && (
                <div>
                  <h3
                    className="text-sm font-medium text-foreground/60 mb-3"
                  >
                    This week
                    {' '}
                    <span
                      className="text-foreground/40"
                    >
                      (
                      {thisWeek.length}
                      )
                    </span>
                  </h3>
                  <div
                    className="grid gap-4 sm:gap-6"
                  >
                    {thisWeek.map((event) => (
                      <SceneEventCard
                        key={event.id}
                        event={event}
                        interested={interestedByEvent[event.id] ?? []}
                      />
                    ))}
                  </div>
                </div>
              )}
              {thisMonth.length > 0 && (
                <div>
                  <h3
                    className="text-sm font-medium text-foreground/60 mb-3"
                  >
                    This month
                    {' '}
                    <span
                      className="text-foreground/40"
                    >
                      (
                      {thisMonth.length}
                      )
                    </span>
                  </h3>
                  <div
                    className="grid gap-4 sm:gap-6"
                  >
                    {thisMonth.map((event) => (
                      <SceneEventCard
                        key={event.id}
                        event={event}
                        interested={interestedByEvent[event.id] ?? []}
                      />
                    ))}
                  </div>
                </div>
              )}
              {later.length > 0 && (
                <div>
                  <h3
                    className="text-sm font-medium text-foreground/60 mb-3"
                  >
                    Later
                    {' '}
                    <span
                      className="text-foreground/40"
                    >
                      (
                      {later.length}
                      )
                    </span>
                  </h3>
                  <div
                    className="grid gap-4 sm:gap-6"
                  >
                    {later.map((event) => (
                      <SceneEventCard
                        key={event.id}
                        event={event}
                        interested={interestedByEvent[event.id] ?? []}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Past */}
      {hasAnyEvents && pastTotalCount > 0 && (
        <section>
          <h2
            className="text-lg font-semibold mb-4 opacity-70"
          >
            Past events
          </h2>
          <PastSceneEventsPaginated
            initialEvents={initialPastEvents}
            initialInterestedByEvent={interestedByEvent}
            totalCount={pastTotalCount}
            perPage={pastPerPage}
          />
        </section>
      )}
    </div>
  );
}
