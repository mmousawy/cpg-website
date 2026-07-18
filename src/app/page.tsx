import { cacheLife, cacheTag } from 'next/cache';
import Link from 'next/link';
import { preload } from 'react-dom';

import AlbumGrid from '@/components/album/AlbumGrid';
import Avatar from '@/components/auth/Avatar';
import ChallengesList from '@/components/challenges/ChallengesList';
import EventsList from '@/components/events/EventsList';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import ActivitiesSliderWrapper from '@/components/shared/ActivitiesSliderWrapper';
import ArrowLink from '@/components/shared/ArrowLink';
import Button from '@/components/shared/Button';
import HeroImage from '@/components/shared/HeroImage';
import { routes } from '@/config/routes';
import { socialLinks } from '@/config/socials';
import { createMetadata } from '@/utils/metadata';
import {
  DEFAULT_SUPABASE_IMAGE_QUALITY,
  getCroppedThumbnailUrl,
  getPreloadImageUrl,
} from '@/utils/supabaseImageLoader';

// Cached data functions
import { getRecentAlbums } from '@/lib/data/albums';
import { getActiveChallenges } from '@/lib/data/challenges';
import { getEventAttendees, getUpcomingEvents } from '@/lib/data/events';
import { getPublicPhotostream } from '@/lib/data/gallery';
import { getOrganizers, getRecentMembers } from '@/lib/data/profiles';

export const metadata = {
  ...createMetadata({
    title: 'Photography meetups & community in the Netherlands',
    description: 'A community for analog and digital photographers. Join us for monthly meetups, photo challenges, and skill-sharing talks in the Netherlands.',
    canonical: '/',
    keywords: ['photography', 'photography meetups', 'Netherlands', 'photo walks', 'photography community'],
  }),
  title: {
    absolute: 'Photography meetups & community in the Netherlands - Creative Photography Group',
  },
};

import SignUpCTA from '@/components/shared/SignUpCTA';
import DiscordSVG from 'public/icons/discord.svg';
import InstagramSVG from 'public/icons/instagram.svg';
import WhatsAppSVG from 'public/icons/whatsapp.svg';

// Map for social icons
const socialIconMap: Record<string, typeof DiscordSVG> = {
  Discord: DiscordSVG,
  Instagram: InstagramSVG,
  WhatsApp: WhatsAppSVG,
};

const heroImages = [
  'https://db.creativephotography.group/storage/v1/object/public/cpg-public/hero/home-hero1.jpg',
  'https://db.creativephotography.group/storage/v1/object/public/cpg-public/hero/home-hero2.jpg',
  'https://db.creativephotography.group/storage/v1/object/public/cpg-public/hero/home-hero3.jpg',
  'https://db.creativephotography.group/storage/v1/object/public/cpg-public/hero/home-hero4.jpg',
  'https://db.creativephotography.group/storage/v1/object/public/cpg-public/hero/home-hero5.jpg',
  'https://db.creativephotography.group/storage/v1/object/public/cpg-public/hero/home-hero6.jpg',
  'https://db.creativephotography.group/storage/v1/object/public/cpg-public/hero/home-hero7.jpg',
];

export default async function Home() {
  'use cache';
  cacheLife('max');
  cacheTag('home');

  // Fetch all data in parallel using cached data functions
  const [albums, organizers, members, upcomingEventsData, challengesData, photos] = await Promise.all([
    getRecentAlbums(3),
    getOrganizers(5),
    getRecentMembers(20),
    getUpcomingEvents(6),
    getActiveChallenges(),
    getPublicPhotostream(10),
  ]);

  const { events, serverNow } = upcomingEventsData;
  const attendeesByEvent = await getEventAttendees(events.map((event) => event.id));
  const { challenges } = challengesData;

  // Select hero image server-side for better LCP discovery
  // Use deterministic selection based on date to ensure consistency while still rotating
  // Use serverNow from cached data (already accessed) instead of Date.now()
  const serverDate = new Date(serverNow);
  const yearStart = new Date(serverDate.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((serverNow - yearStart.getTime()) / (1000 * 60 * 60 * 24));
  const heroImage = heroImages[dayOfYear % heroImages.length];

  preload(
    getPreloadImageUrl(heroImage, undefined, DEFAULT_SUPABASE_IMAGE_QUALITY),
    { as: 'image', fetchPriority: 'high' },
  );

  const firstEvent = events[0];
  if (firstEvent?.cover_image) {
    const eventCoverSrc =
      getCroppedThumbnailUrl(firstEvent.cover_image, 640, 274) ?? firstEvent.cover_image;
    preload(
      getPreloadImageUrl(eventCoverSrc, undefined, DEFAULT_SUPABASE_IMAGE_QUALITY),
      { as: 'image', fetchPriority: 'high' },
    );
  }

  return (
    <>
      {/* Hero Section */}
      <div
        className="relative h-[clamp(16rem,22svw,20rem)] w-full bg-background-light"
      >
        {/* Image + scrim wrapper — extends past the hero bottom so the fade
            to background happens behind the first content section rather than
            being cut off at a hard edge. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100%+5rem)] overflow-hidden"
        >
          {/* Background image - server-side selected for optimal LCP */}
          <HeroImage
            src={heroImage}
          />

          {/* Scrim mask — blur is applied directly on the hero image */}
          <div
            className="absolute inset-0 scrim-gradient-mask-strong"
          />

          {/* Gradient overlay */}
          <div
            className="absolute inset-0 scrim-gradient-overlay-strong"
          />
        </div>

        {/* Content overlay */}
        <div
          className="absolute inset-x-0 bottom-0 px-2 sm:px-8"
        >
          <div
            className="flex flex-col items-center mx-auto max-w-screen-md"
          >
            <p
              className="mb-2 px-4 text-5xl md:text-7xl font-heading hero-title-shadow sm:mb-3 text-center"
            >
              Photography, together.
            </p>
            <h1
              className="inline-grid max-sm:grid-rows-2 sm:grid-cols-2 mb-4 px-4 max-w-2xl font-(family-name:--font-geist-sans)! text-lg opacity-80 sm:text-xl hero-title-shadow font-medium"
            >
              Creative Photography Group <span
                className="flex items-center max-sm:justify-center"
              ><span
                className="max-sm:hidden mx-2"
              >&mdash;</span> Shoot. Share. Explore.</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Explore Section - Events & Galleries */}
      <PageContainer
        className='relative z-10'
        innerClassName='space-y-6 md:space-y-8'
      >

        {/* Events */}
        <div
          className="mb-12"
        >
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
          />
        </div>

        {/* Challenges */}
        {challenges.length > 0 && (
          <div
            className="mb-4"
          >
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
              >
                View all challenges
              </ArrowLink>
            </div>
            <ChallengesList
              challenges={challenges.slice(0, 3)}
              serverNow={serverNow}
            />
          </div>
        )}

        {/* Albums */}
        {albums.length > 0 && (
          <div
            className="mb-12"
          >
            <div
              className="mb-4 flex items-center justify-between"
            >
              <h3
                className="text-xl font-semibold font-heading"
              >
                Recent albums
              </h3>
              <ArrowLink
                href={routes.gallery.url}
              >
                View all albums
              </ArrowLink>
            </div>
            <AlbumGrid
              albums={albums}
              className="grid gap-2 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]"
            />
          </div>
        )}

      </PageContainer>

      {/* Recent Photos */}
      {photos.length > 0 && (
        <WidePageContainer
          className="pt-0!"
        >
          <div
            className="mb-4 flex items-center justify-between"
          >
            <h3
              className="text-xl font-semibold font-heading"
            >
              Recent photos
            </h3>
            <ArrowLink
              href="/gallery/photos"
            >
              View all photos
            </ArrowLink>
          </div>
          <JustifiedPhotoGrid
            photos={photos}
            showAttribution
          />
        </WidePageContainer>
      )}

      <PageContainer>
        {/* About Section */}
        <Container>
          <h2
            className="text-2xl font-bold mb-4 font-heading"
          >
            What&apos;s Creative Photography Group?
          </h2>

          <p
            className="max-w-[50ch] text-foreground/90 leading-relaxed mb-4"
          >
            We are a community of photographers who love to create and share our work with others.
            Our goal is to inspire and support each other in our photographic journeys.
            We welcome photographers of all skill levels and backgrounds to join us!
          </p>
          <p
            className="max-w-[50ch] text-foreground/90 leading-relaxed mb-6"
          >
            Join our community for monthly meetups, photo challenges, skill-sharing talks, and more.
            Whether you&apos;re just starting out or have been shooting for years, you&apos;ll find a welcoming space here.
          </p>

          <div>
            <h3
              className="text-lg font-semibold mb-4"
            >
              Connect with us
            </h3>
            <div
              className="flex flex-wrap gap-3"
            >
              {socialLinks.map((social) => {
                const Icon = socialIconMap[social.name];
                return (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center justify-center gap-2 rounded-full border border-border-color-strong bg-background px-4 py-1.5 text-sm font-medium font-(family-name:--font-geist-mono) text-foreground transition-colors hover:bg-(--hover-bg) hover:border-(--hover-color) hover:text-(--hover-color)"
                    style={{
                      '--hover-color': social.color,
                      '--hover-bg': `${social.color}15`,
                    } as React.CSSProperties}
                  >
                    <Icon
                      className="size-6 shrink-0 transition-colors group-hover:fill-(--hover-color)"
                    />
                    <span>
                      {social.name}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </Container>
      </PageContainer>

      <SignUpCTA
        variant="banner"
      />

      <PageContainer
        className='pt-0!'
      >
        <div
          className='w-full max-w-screen-md mx-auto'
        >
          <div
            className='pb-6 sm:pb-14'
          >
            <h2
              className="text-2xl text-center font-bold mb-6 px-2 sm:px-4 font-heading"
            >
              What keeps us clicking
            </h2>
            <ActivitiesSliderWrapper />
          </div>
        </div>

        {/* Meet the Community Section */}
        <Container>
          <h2
            className="text-2xl font-bold mb-4 font-heading"
          >
            Meet the community
          </h2>
          <p
            className="max-w-[50ch] text-foreground/90 leading-relaxed mb-8"
          >
            Meet the team of dedicated organizers who keep the community thriving, and passionate photographers who are eager to share their work and learn from others!
          </p>

          {/* Organizers */}
          {organizers && organizers.length > 0 && (
            <div
              className="mb-8"
            >
              <h3
                className="text-lg font-semibold mb-4"
              >
                Organizers
              </h3>
              <div
                className="grid gap-4 sm:grid-cols-2 sm:gap-6"
              >
                {organizers.map((organizer) => (
                  <Link
                    key={organizer.id}
                    href={organizer.nickname ? `/@${organizer.nickname}` : '#'}
                    className="flex items-start gap-4 rounded-xl border border-border-color bg-background/60 p-4 transition-colors hover:border-primary group"
                  >
                    <Avatar
                      avatarUrl={organizer.avatar_url}
                      fullName={organizer.full_name}
                      size="lg"
                      hoverEffect
                    />
                    <div
                      className="flex-1 min-w-0"
                    >
                      <p
                        className="font-semibold group-hover:text-primary transition-colors leading-tight"
                      >
                        {organizer.full_name || 'Organizer'}
                      </p>
                      {organizer.nickname && (
                        <p
                          className="text-sm opacity-80 group-hover:text-primary transition-colors"
                        >
                          {`@${
                            organizer.nickname
                          }`}
                        </p>
                      )}
                      {organizer.bio && (
                        <p
                          className="mt-4 text-sm text-foreground/80 line-clamp-2"
                        >
                          {organizer.bio}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Members */}
          {members && members.length > 0 && (
            <div>
              <h3
                className="text-lg font-semibold mb-4"
              >
                Members
              </h3>
              <div
                className="flex flex-wrap gap-2"
              >
                {members.map((member) => (
                  <Button
                    key={member.id}
                    href={member.nickname ? `/@${member.nickname}` : '#'}
                    variant="secondary"
                    size="sm"
                    className="px-2!"
                    icon={
                      <Avatar
                        avatarUrl={member.avatar_url}
                        fullName={member.full_name}
                        size="xxs"
                        hoverEffect
                      />
                    }
                  >
                    {`@${
                      member.nickname || member.full_name
                    }`}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Container>
      </PageContainer>
    </>
  );
}
