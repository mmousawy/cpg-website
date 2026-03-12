import { cacheLife, cacheTag } from 'next/cache';

import PageContainer from '@/components/layout/PageContainer';
import AddSceneEventButton from '@/components/scene/AddSceneEventButton';
import ScenePageContent from '@/components/scene/ScenePageContent';
import HelpLink from '@/components/shared/HelpLink';
import { createMetadata } from '@/utils/metadata';

import {
  getCpgPastSceneEvents,
  getCpgUpcomingSceneEvents,
  mergePastWithCpg,
  mergeUpcomingWithCpg,
} from '@/data/cpg-scene-events';
import { cpgEventToSceneEvent } from '@/lib/data/cpg-events-to-scene';
import {
  getPastSceneEvents,
  getSceneEventInterests,
  getUpcomingSceneEvents,
} from '@/lib/data/scene';
import { getPastEvents, getUpcomingEvents } from '@/lib/data/events';

const PAST_EVENTS_PER_PAGE = 5;

export const metadata = createMetadata({
  title: 'Explore the scene',
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
  cacheLife('hours');
  cacheTag('scene');

  const [upcomingData, pastData, cpgUpcomingData, cpgPastData] = await Promise.all([
    getUpcomingSceneEvents(),
    getPastSceneEvents(PAST_EVENTS_PER_PAGE),
    getUpcomingEvents(),
    getPastEvents(PAST_EVENTS_PER_PAGE),
  ]);

  const nowDate = new Date().toISOString().split('T')[0];
  const cpgStaticUpcoming = getCpgUpcomingSceneEvents(nowDate);
  const cpgStaticPast = getCpgPastSceneEvents(nowDate);

  const cpgDbUpcoming = cpgUpcomingData.events.map(cpgEventToSceneEvent);
  const cpgDbPast = cpgPastData.events.map(cpgEventToSceneEvent);

  const allCpgUpcoming = [...cpgStaticUpcoming, ...cpgDbUpcoming];
  const allCpgPast = [...cpgStaticPast, ...cpgDbPast];

  const upcomingEvents = mergeUpcomingWithCpg(upcomingData.events, allCpgUpcoming);
  const initialPast = mergePastWithCpg(pastData.events, allCpgPast);

  const cpgPastCount = allCpgPast.length;

  console.log('[Scene Page] CPG merge:', {
    nowDate,
    dbUpcoming: upcomingData.events.length,
    cpgDbUpcoming: cpgDbUpcoming.length,
    cpgStaticUpcoming: cpgStaticUpcoming.length,
    mergedUpcoming: upcomingEvents.length,
    mergedPast: initialPast.length,
    cpgIdsInUpcoming: upcomingEvents.filter((e) => e.id.startsWith('cpg-')).map((e) => e.id),
    cpgIdsInPast: initialPast.filter((e) => e.id.startsWith('cpg-')).map((e) => e.id),
  });

  const pastTotalCount = pastData.totalCount; // DB only; CPG past are prepended, not paginated

  const displayedEventIds = [
    ...upcomingEvents.map((e) => e.id),
    ...initialPast.map((e) => e.id),
  ].filter((id) => !id.startsWith('cpg-')); // Only DB events have interests
  const interestedByEvent = await getSceneEventInterests(displayedEventIds);

  return (
    <PageContainer>
      <div
        className="mb-8"
      >
        <div
          className="flex flex-wrap items-center justify-between gap-2 mb-2"
        >
          <div
            className="flex items-center gap-2"
          >
            <h1
              className="text-2xl sm:text-3xl font-bold"
            >
              Explore the scene
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
        cpgPastCount={cpgPastCount}
        interestedByEvent={interestedByEvent}
      />
    </PageContainer>
  );
}
