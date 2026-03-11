import { cacheLife, cacheTag } from 'next/cache';

import PageContainer from '@/components/layout/PageContainer';
import AddSceneEventButton from '@/components/scene/AddSceneEventButton';
import ScenePageContent from '@/components/scene/ScenePageContent';
import HelpLink from '@/components/shared/HelpLink';
import { createMetadata } from '@/utils/metadata';

import {
  getPastSceneEvents,
  getSceneEventInterests,
  getUpcomingSceneEvents,
} from '@/lib/data/scene';

const PAST_EVENTS_PER_PAGE = 5;

export const metadata = createMetadata({
  title: 'Scene',
  description:
    'A community-curated guide to photography events — exhibitions, photowalks, workshops, talks, and more. Added by members, for members.',
  canonical: '/scene',
  keywords: [
    'photography events',
    'exhibitions',
    'photowalks',
    'workshops',
    'photo festivals',
  ],
});

export default async function ScenePage() {
  'use cache';
  cacheLife('max');
  cacheTag('scene');

  const [upcomingData, pastData] = await Promise.all([
    getUpcomingSceneEvents(),
    getPastSceneEvents(PAST_EVENTS_PER_PAGE),
  ]);

  const { events: upcomingEvents } = upcomingData;
  const { events: initialPast, totalCount: pastTotalCount } = pastData;

  const displayedEventIds = [
    ...upcomingEvents.map((e) => e.id),
    ...initialPast.map((e) => e.id),
  ];
  const interestedByEvent = await getSceneEventInterests(displayedEventIds);

  return (
    <PageContainer>
      <div
        className="mb-8"
      >
        <div
          className="flex flex-wrap items-center justify-between gap-4 mb-2"
        >
          <div
            className="flex items-center gap-2"
          >
            <h1
              className="text-2xl sm:text-3xl font-bold"
            >
              Scene
            </h1>
            <HelpLink
              href="what-is-scene"
              label="What is Scene?"
              size="lg"
            />
          </div>
          <AddSceneEventButton />
        </div>
        <p
          className="text-base sm:text-lg mt-2 text-foreground/70"
        >
          A community-curated guide to photography events.
          Added by members, for members.
        </p>
      </div>

      <ScenePageContent
        upcomingEvents={upcomingEvents}
        initialPastEvents={initialPast}
        pastTotalCount={pastTotalCount}
        pastPerPage={PAST_EVENTS_PER_PAGE}
        interestedByEvent={interestedByEvent}
      />
    </PageContainer>
  );
}
