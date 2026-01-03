import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'

// Hero images - rotated every ~4 days
import heroImg1 from 'public/gallery/home-hero1.jpg'
import heroImg2 from 'public/gallery/home-hero2.jpg'
import heroImg3 from 'public/gallery/home-hero3.jpg'
import heroImg4 from 'public/gallery/home-hero4.jpg'
import heroImg5 from 'public/gallery/home-hero5.jpg'
import heroImg6 from 'public/gallery/home-hero6.jpg'
import heroImg7 from 'public/gallery/home-hero7.jpg'
import heroImg8 from 'public/gallery/home-hero8.jpg'

const heroImages = [heroImg1, heroImg2, heroImg3, heroImg4, heroImg5, heroImg6, heroImg7, heroImg8]

function getHeroImage() {
  const index = Math.floor(Math.random() * heroImages.length);
  return heroImages[index]
}

import PageContainer from '@/components/layout/PageContainer'
import Container from '@/components/layout/Container'
import RecentEvents, { RecentEventsLoading } from '@/components/events/RecentEvents'
import AlbumGrid from '@/components/album/AlbumGrid'
import Avatar from '@/components/auth/Avatar'
import Button from '@/components/shared/Button'
import ArrowLink from '@/components/shared/ArrowLink'
import { socialLinks } from '@/config/socials'
import type { AlbumWithPhotos } from '@/types/albums'

import DiscordSVG from 'public/icons/discord.svg'
import InstagramSVG from 'public/icons/instagram.svg'
import WhatsAppSVG from 'public/icons/whatsapp.svg'
import CameraWithFlash from 'public/camera-with-flash.png'

// Map for social icons
const socialIconMap: Record<string, typeof DiscordSVG> = {
  Discord: DiscordSVG,
  Instagram: InstagramSVG,
  WhatsApp: WhatsAppSVG,
}

// Revalidate every 60 seconds
export const revalidate = 60

export default async function Home() {
  const supabase = await createClient()

  // Fetch recent public albums
  const { data: albums } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      created_at,
      profile:profiles(full_name, nickname, avatar_url),
      photos:album_photos(id, photo_url)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(6)

  const albumsWithPhotos = (albums || []) as unknown as AlbumWithPhotos[]

  // Fetch organizers (admins)
  const { data: organizers } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url, bio')
    .eq('is_admin', true)
    .limit(5)

  // Fetch recent members
  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url')
    .not('nickname', 'is', null)
    .order('created_at', { ascending: false })
    .limit(12)

  // Get total member count
  const { count: memberCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .not('nickname', 'is', null)

  return (
    <>
      {/* Hero Section */}
      <div className="relative h-80 sm:h-96 md:h-[28rem] w-full overflow-hidden bg-background-light">
        {/* Background image */}
        <Image
          src={getHeroImage()}
          alt="Creative Photography Group meetup"
          fill
          className="object-cover brightness-75 animate-fade-in"
          placeholder="blur"
          priority
          sizes="100vw"
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

      {/* About Section */}
      <PageContainer innerClassName="space-y-8">
        <Container>
          <h2 className="text-2xl font-bold mb-4">What&apos;s Creative Photography Group?</h2>
          
          <p className="text-foreground/90 leading-relaxed mb-4">
            We are a community of photographers who love to create and share our work with others. 
            Our goal is to inspire and support each other in our photographic journeys. 
            We welcome photographers of all skill levels and backgrounds to join us!
          </p>
          <p className="text-foreground/90 leading-relaxed mb-6">
            Join our community for monthly meetups, photo challenges, skill-sharing talks, and more. 
            Whether you&apos;re just starting out or have been shooting for years, you&apos;ll find a welcoming space here.
          </p>
          
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Things we do</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Monthly meetups & socials */}
              <div className="group flex items-start gap-3 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4 transition-all hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-300">Monthly meetups</p>
                  <p className="text-sm text-foreground/70 mt-0.5">Connect, inspire & share ideas in a social and cozy vibe</p>
                </div>
              </div>

              {/* Photo challenges */}
              <div className="group flex items-start gap-3 rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-pink-500/5 p-4 transition-all hover:border-rose-500/40 hover:shadow-lg hover:shadow-rose-500/5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-rose-700 dark:text-rose-300">Photo challenges</p>
                  <p className="text-sm text-foreground/70 mt-0.5">Monthly prompts & sharing results to spur creativity</p>
                </div>
              </div>

              {/* Talks & skill sharing */}
              <div className="group flex items-start gap-3 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-purple-500/5 p-4 transition-all hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-600 dark:text-violet-400">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-violet-700 dark:text-violet-300">Talks & skill sharing</p>
                  <p className="text-sm text-foreground/70 mt-0.5">Learn from the community</p>
                </div>
              </div>

              {/* Collaborative projects */}
              <div className="group flex items-start gap-3 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-teal-500/5 p-4 transition-all hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-cyan-700 dark:text-cyan-300">Collaborative projects</p>
                  <p className="text-sm text-foreground/70 mt-0.5">Create & collaborate on projects together</p>
                </div>
              </div>

              {/* Photo walks */}
              <div className="group flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-green-500/5 p-4 transition-all hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">Photo walks</p>
                  <p className="text-sm text-foreground/70 mt-0.5">Get out, explore new locations & shoot together</p>
                </div>
              </div>

              {/* Excursions */}
              <div className="group flex items-start gap-3 rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-blue-500/5 p-4 transition-all hover:border-sky-500/40 hover:shadow-lg hover:shadow-sky-500/5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sky-700 dark:text-sky-300">Excursions</p>
                  <p className="text-sm text-foreground/70 mt-0.5">Visit museums, parks & inspiring places together</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Connect with us</h3>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social) => {
                const Icon = socialIconMap[social.name]
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
                )
              })}
            </div>
          </div>
        </Container>  

        {/* Explore Section - Events & Galleries */}
        <Container>
          <h2 className="text-2xl font-bold mb-4">Explore what we're up to</h2>
          <p className="text-foreground/90 leading-relaxed mb-8">
            Join our meetups and discover photos from the community.
          </p>

          {/* Events */}
          <div className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recent events</h3>
              <ArrowLink href="/events">View all</ArrowLink>
            </div>
            <Suspense fallback={<RecentEventsLoading />}>
              <RecentEvents />
            </Suspense>
          </div>

          {/* Galleries */}
          {albumsWithPhotos.length > 0 && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent galleries</h3>
                <ArrowLink href="/galleries">View all</ArrowLink>
              </div>
              <AlbumGrid albums={albumsWithPhotos} />
            </div>
          )}
        </Container>

        {/* Community Section */}
        {((organizers?.length ?? 0) > 0 || (members?.length ?? 0) > 0) && (
          <Container>
            <h2 className="text-2xl font-bold mb-4">Meet the community</h2>
            <p className="text-foreground/90 leading-relaxed mb-6">
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
        )}
      </PageContainer>
    </>
  )
}
