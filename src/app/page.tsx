import { createPublicClient } from '@/utils/supabase/server';
import Image from 'next/image';
import Link from 'next/link';

// Hero images - using URL paths instead of static imports to avoid bundling blur placeholders
const heroImages = [
  '/gallery/home-hero1.jpg',
  '/gallery/home-hero2.jpg',
  '/gallery/home-hero3.jpg',
  '/gallery/home-hero4.jpg',
  '/gallery/home-hero5.jpg',
  '/gallery/home-hero6.jpg',
  '/gallery/home-hero7.jpg',
];

function getHeroImage() {
  const index = Math.floor(Math.random() * heroImages.length);
  return heroImages[index];
}

import AlbumGrid from '@/components/album/AlbumGrid';
import Avatar from '@/components/auth/Avatar';
import RecentEventsList from '@/components/events/RecentEventsList';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import ActivitiesSlider from '@/components/shared/ActivitiesSlider';
import ArrowLink from '@/components/shared/ArrowLink';
import Button from '@/components/shared/Button';
import { socialLinks } from '@/config/socials';
import type { AlbumWithPhotos } from '@/types/albums';

import { routes } from '@/config/routes';
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

// Revalidate every 60 seconds
// Cache indefinitely - revalidated on-demand when data changes

export default async function Home() {
  const supabase = createPublicClient();

  // Fetch all data in parallel for faster page load and no-JS compatibility
  const [
    { data: albums },
    { data: organizers },
    { data: members },
    { data: events },
  ] = await Promise.all([
    // Fetch recent public albums
    supabase
      .from('albums')
      .select(`
        id,
        title,
        description,
        slug,
        cover_image_url,
        is_public,
        created_at,
        profile:profiles(full_name, nickname, avatar_url, suspended_at),
        photos:album_photos_active!inner(
          id,
          photo_url
        )
      `)
      .eq('is_public', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(6),
    // Fetch organizers (admins) - exclude suspended
    supabase
      .from('profiles')
      .select('id, full_name, nickname, avatar_url, bio')
      .eq('is_admin', true)
      .is('suspended_at', null)
      .limit(5),
    // Fetch recent members - exclude suspended
    supabase
      .from('profiles')
      .select('id, full_name, nickname, avatar_url')
      .not('nickname', 'is', null)
      .is('suspended_at', null)
      .order('created_at', { ascending: false })
      .limit(12),
    // Fetch recent events - get more to allow client-side sorting for upcoming/past mix
    supabase
      .from('events')
      .select('id, title, date, location, time, cover_image, image_url, slug, description')
      .order('date', { ascending: false })
      .limit(6),
  ]);

  // Filter out albums with no photos and albums from suspended users
  // album_photos_active view already excludes deleted photos
  const albumsWithPhotos = ((albums || []) as any[])
    .filter((album) => {
      // Exclude albums from suspended users and albums with no photos
      const profile = album.profile as any;
      return album.photos && album.photos.length > 0 && profile && !profile.suspended_at;
    }) as unknown as AlbumWithPhotos[];

  return (
    <>
      {/* Hero Section */}
      <div className="relative h-[clamp(16rem,25svw,24rem)] w-full overflow-hidden bg-background-light">
        {/* Background image */}
        <Image
          src={getHeroImage()}
          alt="Creative Photography Group meetup"
          fill
          className="object-cover object-[center_30%] brightness-75 animate-fade-in"
          priority
          sizes="60vw"
          quality={95}
        />

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
            <RecentEventsList events={events || []} />
          </div>

          {/* Albums */}
          {albumsWithPhotos.length > 0 && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent albums</h3>
                <ArrowLink href={routes.gallery.url}>View all</ArrowLink>
              </div>
              <AlbumGrid albums={albumsWithPhotos} className="grid gap-2 sm:gap-6 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]" />
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
            <ActivitiesSlider />
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
