import type { ChallengeWithStats } from '@/types/challenges';
import type { CPGEvent, EventAttendee } from '@/types/events';
import type { AlbumWithPhotos } from '@/types/albums';
import { filterActiveChallenges } from '@/lib/challenges/filters';
import { filterUpcomingEvents } from '@/lib/events/filters';
import { getServerNow } from '@/lib/cache/serverNow';
import { cacheLife, cacheTag } from 'next/cache';

import { getRecentAlbums } from './albums';
import { getPublishedChallengesWithStats } from './challenges';
import { getEventAttendees, getPublishedEvents } from './events';
import { type StreamPhoto, getPublicPhotostream } from './gallery';
import { getOrganizers, getRecentMembers } from './profiles';

export type HomePageData = {
  serverNow: number;
  events: CPGEvent[];
  attendeesByEvent: Record<number, EventAttendee[]>;
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
 */
export async function getHomePageData(): Promise<HomePageData> {
  'use cache';
  cacheLife('home');
  cacheTag('home');

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
    getRecentAlbums(4),
    getPublicPhotostream(10),
    getOrganizers(5),
    getRecentMembers(8),
  ]);

  const events = filterUpcomingEvents(publishedEvents, serverNow).slice(0, 3);
  const challenges = filterActiveChallenges(publishedChallenges, serverNow).slice(0, 4);
  const attendeesByEvent = events.length > 0
    ? await getEventAttendees(events.map((event) => event.id))
    : ({} as Record<number, EventAttendee[]>);

  return {
    serverNow,
    events,
    attendeesByEvent,
    challenges,
    albums,
    photos,
    organizers,
    recentMembers,
  };
}
