import { getServerNow } from '@/lib/cache/serverNow';
import { filterActiveChallenges } from '@/lib/challenges/filters';
import { filterUpcomingEvents } from '@/lib/events/filters';
import type { AlbumWithPhotos } from '@/types/albums';
import type { ChallengeWithStats } from '@/types/challenges';
import type { CPGEvent, EventAttendee } from '@/types/events';

import { PHOTO_SECTION_FETCH_LIMIT } from '@/utils/displayPreferences';
import { getRecentAlbums } from './albums';
import { getPublishedChallengesWithStats } from './challenges';
import { getEventAttendees, getEventPhotoCounts, getPublishedEvents } from './events';

import { getPublicPhotostream, type StreamPhoto } from './gallery';
import { getOrganizers, getRecentMembers } from './profiles';

export type HomePageData = {
  serverNow: number;
  events: CPGEvent[];
  attendeesByEvent: Record<number, EventAttendee[]>;
  photoCountsByEvent: Record<number, number>;
  challenges: ChallengeWithStats[];
  albums: AlbumWithPhotos[];
  photos: StreamPhoto[];
  organizers: Awaited<ReturnType<typeof getOrganizers>>;
  recentMembers: Awaited<ReturnType<typeof getRecentMembers>>;
};

/**
 * Homepage data in two parallel waves:
 * 1. All independent cached queries at once
 * 2. Attendees after upcoming events are known
 *
 * The page caches this result with the `home` tag and rerenders only when that tag is expired.
 */
export async function getHomePageData(includeTestContent = false): Promise<HomePageData> {
  const [
    serverNow,
    publishedEvents,
    publishedChallenges,
    albums,
    photos,
    organizers,
    recentMembers,
  ] = await Promise.all([
    getServerNow(),
    getPublishedEvents(),
    getPublishedChallengesWithStats(),
    getRecentAlbums(4, includeTestContent),
    getPublicPhotostream(PHOTO_SECTION_FETCH_LIMIT, 'recent', includeTestContent),
    getOrganizers(5),
    getRecentMembers(8, includeTestContent),
  ]);

  const events = filterUpcomingEvents(publishedEvents, serverNow).slice(0, 3);
  const challenges = filterActiveChallenges(publishedChallenges, serverNow).slice(0, 4);
  const eventIds = events.map((event) => event.id);
  const [attendeesByEvent, photoCountsByEvent] = eventIds.length > 0
    ? await Promise.all([
      getEventAttendees(eventIds),
      getEventPhotoCounts(eventIds),
    ])
    : [{} as Record<number, EventAttendee[]>, {} as Record<number, number>];

  return {
    serverNow,
    events,
    attendeesByEvent,
    photoCountsByEvent,
    challenges,
    albums,
    photos,
    organizers,
    recentMembers,
  };
}
