import ChallengesList from '@/components/challenges/ChallengesList';
import EventsList from '@/components/events/EventsList';
import PageContainer from '@/components/layout/PageContainer';
import ArrowLink from '@/components/shared/ArrowLink';
import { routes } from '@/config/routes';
import type { HomePageData } from '@/lib/data/home';

type HomeExploreSectionProps = Pick<
  HomePageData,
  'events' | 'attendeesByEvent' | 'challenges' | 'serverNow'
>;

export function HomeExploreSection({
  events,
  attendeesByEvent,
  challenges,
  serverNow,
}: HomeExploreSectionProps) {
  return (
    <PageContainer
      className="relative z-10 py-0!"
      innerClassName="grid gap-10 md:gap-12"
    >
      <div>
        <div
          className="mb-4 flex items-center justify-between"
        >
          <h2
            className="text-xl font-semibold font-heading"
          >
            Upcoming events
          </h2>
          <ArrowLink
            href={routes.events.url}
            prefetch={false}
          >
            View all events
          </ArrowLink>
        </div>
        <EventsList
          events={events}
          attendeesByEvent={attendeesByEvent}
          variant="compact"
          max={3}
          disableAttendeesPopover
          avatarSize="xs"
          serverNow={serverNow}
          prefetchLinks={false}
        />
      </div>

      {challenges.length > 0 && (
        <div>
          <div
            className="mb-4 flex items-center justify-between"
          >
            <h3
              className="text-xl font-semibold font-heading"
            >
              Photo challenges
            </h3>
            <ArrowLink
              href={routes.challenges.url}
              prefetch={false}
            >
              View all challenges
            </ArrowLink>
          </div>
          <ChallengesList
            challenges={challenges}
            serverNow={serverNow}
            prefetchLinks={false}
            className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] sm:[&>:nth-child(n+4)]:hidden"
          />
        </div>
      )}
    </PageContainer>
  );
}
