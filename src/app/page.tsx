import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

import AlbumGrid from '@/components/album/AlbumGrid';
import Avatar from '@/components/auth/Avatar';
import RecentEventsList from '@/components/events/RecentEventsList';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import ActivitiesSliderWrapper from '@/components/shared/ActivitiesSliderWrapper';
import ArrowLink from '@/components/shared/ArrowLink';
import Button from '@/components/shared/Button';
import RandomHeroImage from '@/components/shared/RandomHeroImage';
import { routes } from '@/config/routes';
import { socialLinks } from '@/config/socials';

// Cached data functions
import { getRecentAlbums } from '@/lib/data/albums';
import { getRecentEvents } from '@/lib/data/events';
import { getOrganizers, getRecentMembers } from '@/lib/data/profiles';

import CameraWithFlash from 'public/camera-with-flash.png';
import DiscordSVG from 'public/icons/discord.svg';
import InstagramSVG from 'public/icons/instagram.svg';
import WhatsAppSVG from 'public/icons/whatsapp.svg';

// Map for social icons
const socialIconMap: Record<string, typeof DiscordSVG> = {
  Discord: DiscordSVG,
  Instagram: InstagramSVG,
  WhatsApp: WhatsAppSVG,
};

export default async function Home() {
  // Fetch all data in parallel using cached data functions
  const [albums, organizers, members, eventsData] = await Promise.all([
    getRecentAlbums(6),
    getOrganizers(5),
    getRecentMembers(12),
    getRecentEvents(6),
  ]);

  const { events, serverNow } = eventsData;

  return (
    <>
      {/* Hero Section */}
      <div className="relative h-[clamp(16rem,25svw,24rem)] w-full overflow-hidden bg-background-light">
        {/* Background image - client component for random selection */}
        <Suspense fallback={<div className="absolute inset-0 bg-background-light" />}>
          <RandomHeroImage />
        </Suspense>

        {/* Frosted glass blur layer - starts higher on desktop */}
        <div className="absolute inset-x-0 bottom-0 h-full backdrop-blur-md scrim-gradient-mask-strong" />

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-full scrim-gradient-overlay-strong" />

        {/* Content overlay */}
        <div className="absolute inset-x-0 bottom-0 pb-4 px-4 sm:px-8 sm:pb-0">
          <div className="mx-auto max-w-screen-md text-center">
            <h1 className="text-5xl font-bold md:text-6xl mb-4">
              Shoot, Share & Explore <Image src={CameraWithFlash} quality={95} height={60} width={60} alt="Camera with flash" className="inline-block ml-2 align-top h-12 w-auto md:h-[3.75rem]" />
            </h1>
            <p className="text-lg sm:text-xl opacity-80 max-w-2xl mx-auto">
              A community for analog and digital photography enthusiasts
            </p>
          </div>
        </div>
      </div>

      {/* Explore Section - Events & Galleries */}
      <PageContainer innerClassName='space-y-6 md:space-y-8'>
        <Container variant="gradient">
          <h2 className="text-2xl font-bold mb-2">Explore what we&apos;re up to</h2>
          <p className="text-foreground/70 leading-relaxed mb-8">
            Join our meetups and discover photos from the community.
          </p>

          {/* Events */}
          <div className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recent events</h3>
              <ArrowLink href={routes.events.url}>View all</ArrowLink>
            </div>
            <RecentEventsList events={events} serverNow={serverNow} />
          </div>

          {/* Albums */}
          {albums.length > 0 && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent albums</h3>
                <ArrowLink href={routes.gallery.url}>View all</ArrowLink>
              </div>
              <AlbumGrid albums={albums} className="grid gap-2 sm:gap-6 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]" />
            </div>
          )}
        </Container>

        {/* About Section */}
        <Container variant="gradient">
          <h2 className="text-2xl font-bold mb-4">What&apos;s Creative Photography Group?</h2>

          <p className="max-w-[50ch] text-foreground/90 leading-relaxed mb-4">
            We are a community of photographers who love to create and share our work with others.
            Our goal is to inspire and support each other in our photographic journeys.
            We welcome photographers of all skill levels and backgrounds to join us!
          </p>
          <p className="max-w-[50ch] text-foreground/90 leading-relaxed mb-6">
            Join our community for monthly meetups, photo challenges, skill-sharing talks, and more.
            Whether you&apos;re just starting out or have been shooting for years, you&apos;ll find a welcoming space here.
          </p>

          <div>
            <h3 className="text-lg font-semibold mb-4">Connect with us</h3>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social) => {
                const Icon = socialIconMap[social.name];
                return (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center justify-center gap-2 rounded-full border border-border-color-strong bg-background px-4 py-2 text-sm font-medium font-[family-name:var(--font-geist-mono)] text-foreground transition-colors hover:bg-[var(--hover-bg)] hover:border-[var(--hover-color)] hover:text-[var(--hover-color)]"
                    style={{
                      '--hover-color': social.color,
                      '--hover-bg': `${social.color}15`,
                    } as React.CSSProperties}
                  >
                    <Icon className="size-6 shrink-0 transition-colors group-hover:fill-[var(--hover-color)]" />
                    <span>{social.name}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </Container>

        <div className='w-full max-w-screen-md mx-auto overflow-hidden'>
          <div className='py-4 sm:py-10'>
            <h2 className="text-2xl text-center font-bold mb-6 px-2 sm:px-4">What keeps us clicking</h2>
            <ActivitiesSliderWrapper />
          </div>
        </div>

        {/* Meet the Community Section */}
        <Container variant="gradient">
          <h2 className="text-2xl font-bold mb-4">Meet the community</h2>
          <p className="max-w-[50ch] text-foreground/90 leading-relaxed mb-6">
            Meet the team of dedicated organizers who keep the community thriving, and passionate photographers who are eager to share their work and learn from others!
          </p>

          {/* Organizers */}
          {organizers && organizers.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Organizers</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {organizers.map((organizer) => (
                  <Link
                    key={organizer.id}
                    href={organizer.nickname ? `/@${organizer.nickname}` : '#'}
                    className="flex items-start gap-4 rounded-xl border border-border-color bg-background p-4 transition-colors hover:border-primary group"
                  >
                    <Avatar
                      avatarUrl={organizer.avatar_url}
                      fullName={organizer.full_name}
                      size="lg"
                      hoverEffect
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold group-hover:text-primary transition-colors">
                        {organizer.full_name || 'Organizer'}
                      </p>
                      {organizer.nickname && (
                        <p className="text-sm opacity-70 group-hover:text-primary transition-colors">
                          @{organizer.nickname}
                        </p>
                      )}
                      {organizer.bio && (
                        <p className="mt-2 text-sm text-foreground/70 line-clamp-2">
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
              <h3 className="text-lg font-semibold mb-4">Members</h3>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <Button
                    key={member.id}
                    href={member.nickname ? `/@${member.nickname}` : '#'}
                    variant="secondary"
                    size="sm"
                    className="!px-2"
                    icon={
                      <Avatar
                        avatarUrl={member.avatar_url}
                        fullName={member.full_name}
                        size="xxs"
                        hoverEffect
                      />
                    }
                  >
                    @{member.nickname || member.full_name}
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
