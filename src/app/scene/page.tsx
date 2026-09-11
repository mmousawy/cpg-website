import PageContainer from '@/components/layout/PageContainer';
import ScenePageContent from '@/components/scene/ScenePageContent';
import ScenePageHeader from '@/app/scene/ScenePageHeader';
import { createMetadata } from '@/utils/metadata';

import {
    getCpgPastSceneEvents,
    getCpgUpcomingSceneEvents,
    mergePastWithCpg,
    mergeUpcomingWithCpg,
} from '@/data/cpg-scene-events';
import { getServerNow } from '@/lib/cache/serverNow';
import { cpgEventToSceneEvent } from '@/lib/data/cpg-events-to-scene';
import { getPastEvents, getUpcomingEvents } from '@/lib/data/events';
import {
    getPastSceneEvents,
    getSceneEventInterests,
    getUpcomingSceneEvents,
} from '@/lib/data/scene';
import { getAmsterdamDateString } from '@/lib/events/status';

const PAST_EVENTS_PER_PAGE = 20;

export const metadata = createMetadata({
  title: 'Browse the photography scene',
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

// Block until cached data resolves so SSR includes full HTML (no streaming shell)
export const instant = false;

export default async function ScenePage() {
  const [upcomingData, pastData, cpgUpcomingData, cpgPastData] = await Promise.all([
    getUpcomingSceneEvents(),
    getPastSceneEvents(PAST_EVENTS_PER_PAGE),
    getUpcomingEvents(),
    getPastEvents(PAST_EVENTS_PER_PAGE),
  ]);

  const serverNow = await getServerNow();
  const nowDate = getAmsterdamDateString(serverNow);
  const cpgStaticUpcoming = getCpgUpcomingSceneEvents(nowDate);
  const cpgStaticPast = getCpgPastSceneEvents(nowDate);

  const cpgDbUpcoming = cpgUpcomingData.events.map(cpgEventToSceneEvent);
  const cpgDbPast = cpgPastData.events.map(cpgEventToSceneEvent);

  const allCpgUpcoming = [...cpgStaticUpcoming, ...cpgDbUpcoming];
  const allCpgPast = [...cpgStaticPast, ...cpgDbPast];

  const upcomingEvents = mergeUpcomingWithCpg(upcomingData.events, allCpgUpcoming);
  const initialPast = mergePastWithCpg(pastData.events, allCpgPast);
  const cpgPastCount = allCpgPast.length;
  const pastTotalCount = pastData.totalCount;

  const INITIAL_VISIBLE = 20;
  const initialVisibleIds = upcomingEvents
    .slice(0, INITIAL_VISIBLE)
    .map((e) => e.id)
    .filter((id) => !id.startsWith('cpg-'));
  const initialInterests = initialVisibleIds.length > 0
    ? await getSceneEventInterests(initialVisibleIds)
    : {};

  return (
    <PageContainer>
      <ScenePageHeader />

      <ScenePageContent
        upcomingEvents={upcomingEvents}
        initialPastEvents={initialPast}
        pastTotalCount={pastTotalCount}
        pastPerPage={PAST_EVENTS_PER_PAGE}
        cpgPastCount={cpgPastCount}
        interestedByEvent={initialInterests}
        now={serverNow}
      />
    </PageContainer>
  );
}
