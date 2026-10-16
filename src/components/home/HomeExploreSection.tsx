import ChallengesList, { challengesListGridClassName } from '@/components/challenges/ChallengesList';
import EventsList from '@/components/events/EventsList';
import PageContainer from '@/components/layout/PageContainer';
import StickySectionHeading from '@/components/layout/StickySectionHeading';
import ArrowLink from '@/components/shared/ArrowLink';
import { HOME_TWO_COLUMN_COVER_SIZES } from '@/config/homeImageSizes';
import { routes } from '@/config/routes';
import type { HomePageData } from '@/lib/data/home';

type HomeExploreSectionProps = Pick<
  HomePageData,
  'events' | 'attendeesByEvent' | 'photoCountsByEvent' | 'challenges' | 'serverNow'
> & {
  showEventDescriptions?: boolean;
};

export function HomeExploreSection({
  events,
  attendeesByEvent,
  photoCountsByEvent,
  challenges,
  serverNow,
  showEventDescriptions = true,
}: HomeExploreSectionProps) {
  return (
    <PageContainer
      className="relative z-10 py-0!"
      innerClassName="grid gap-8 md:gap-10"
    >
      <div>
        <StickySectionHeading
          stickyClassName="mb-4 sm:mb-4"
          accessory={(
            <ArrowLink
              href={routes.events.url}
              prefetch={false}
            >
              View all events
            </ArrowLink>
          )}
        >
          Upcoming events
        </StickySectionHeading>
        <EventsList
          events={events}
          attendeesByEvent={attendeesByEvent}
          photoCountsByEvent={photoCountsByEvent}
          variant="compact"
          max={3}
          disableAttendeesPopover
          avatarSize="xs"
          serverNow={serverNow}
          prefetchLinks={false}
          showDescriptions={showEventDescriptions}
        />
      </div>

      {challenges.length > 0 && (
        <div>
          <StickySectionHeading
            as="h3"
            stickyClassName="mb-4 sm:mb-4"
            accessory={(
              <ArrowLink
                href={routes.challenges.url}
                prefetch={false}
              >
                View all challenges
              </ArrowLink>
            )}
          >
            Photo challenges
          </StickySectionHeading>
          <ChallengesList
            challenges={challenges}
            serverNow={serverNow}
            prefetchLinks={false}
            coverImageSizes={HOME_TWO_COLUMN_COVER_SIZES}
            className={`${challengesListGridClassName} sm:[&>:nth-child(n+4)]:hidden`}
          />
        </div>
      )}
    </PageContainer>
  );
}
