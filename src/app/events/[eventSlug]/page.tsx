import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import PageContainer from '@/components/layout/PageContainer'
import Container from '@/components/layout/Container'
import Attendees, { AttendeesLoading } from '@/components/events/Attendees'
import AddToCalendar from '@/components/events/AddToCalendar'
import EventSignupBar from '@/components/events/EventSignupBar'
import Avatar from '@/components/auth/Avatar'
import type { CPGEvent } from '@/types/events'

import CalendarSVG from 'public/icons/calendar2.svg'
import LocationSVG from 'public/icons/location.svg'
import TimeSVG from 'public/icons/time.svg'

// Revalidate every 60 seconds
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ eventSlug: string }> }) {
  const resolvedParams = await params
  const eventSlug = resolvedParams?.eventSlug || ''

  if (!eventSlug) {
    return {
      title: 'Event Not Found',
    }
  }

  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('title, description')
    .eq('slug', eventSlug)
    .single()

  if (!event) {
    return {
      title: 'Event Not Found',
    }
  }

  return {
    title: `${event.title} - Creative Photography Group`,
    description: event.description || `Join us for ${event.title}`,
  }
}

export default async function EventDetailPage({ params }: { params: Promise<{ eventSlug: string }> }) {
  const resolvedParams = await params
  const eventSlug = resolvedParams?.eventSlug || ''

  if (!eventSlug) {
    notFound()
  }

  const supabase = await createClient()

  // Fetch event
  const { data: event, error } = await supabase
    .from('events')
    .select('id, title, description, date, location, time, cover_image, created_at, image_blurhash, image_height, image_url, image_width, max_attendees, rsvp_count, slug')
    .eq('slug', eventSlug)
    .single()

  if (error || !event) {
    notFound()
  }

  // Format the event date
  const eventDate = event.date ? new Date(event.date) : null
  const formattedDate = eventDate
    ? eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Date TBD'

  // Format time
  const formattedTime = event.time ? event.time.substring(0, 5) : 'Time TBD'

  // Check if event is in the past
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const isPastEvent = eventDate ? eventDate < now : false

  // Fetch hosts/organizers (admins for now)
  const { data: hosts } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url')
    .eq('is_admin', true)
    .limit(5)

  return (
    <>
      {/* Hero Section with Cover Image */}
      {event.cover_image && (
        <div className="relative h-72 sm:h-96 md:h-[28rem] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.cover_image}
            alt={event.title || 'Event cover'}
            className="absolute inset-0 size-full object-cover"
          />
          
          {/* Frosted glass blur layer with eased gradient mask */}
          <div className="absolute inset-x-0 bottom-0 h-full backdrop-blur-md scrim-gradient-mask" />
          
          {/* Eased gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-full scrim-gradient-overlay" />
          
          {/* Title overlay */}
          <div className="absolute inset-x-0 bottom-0 px-4 pb-6 sm:px-8 sm:pb-8">
            <div className="mx-auto max-w-screen-md">
              {isPastEvent && (
                <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                  Past event
                </span>
              )}
              <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">
                {event.title}
              </h1>
            </div>
          </div>
        </div>
      )}

      <PageContainer className={event.cover_image ? '!pt-6 sm:!pt-8' : ''}>
        <Container>
          {/* Title (if no cover image) */}
          {!event.cover_image && (
            <div className="mb-6">
              {isPastEvent && (
                <span className="mb-2 inline-block rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium">
                  Past event
                </span>
              )}
              <h1 className="text-3xl font-bold sm:text-4xl">{event.title}</h1>
            </div>
          )}

          {/* Event Info - Date, Time, Location */}
          <div className="mb-8 space-y-3">
            {/* Date & Time */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="flex items-center gap-2 text-[15px] font-semibold">
                <CalendarSVG className="size-5 shrink-0 fill-foreground" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-2 text-[15px] font-semibold">
                <TimeSVG className="size-5 shrink-0 fill-foreground" />
                {formattedTime}
              </span>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-2 text-[15px] font-semibold">
                <LocationSVG className="size-5 shrink-0 fill-foreground mt-0.5" />
                <span className="whitespace-pre-wrap">{event.location}</span>
              </div>
            )}

            {/* Capacity info */}
            {event.max_attendees && (
              <p className="text-sm text-foreground/70">
                {event.rsvp_count || 0} / {event.max_attendees} spots filled
              </p>
            )}
          </div>

          {/* Hosts Section */}
          {hosts && hosts.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 text-lg font-semibold">Hosts</h2>
              <div className="flex flex-wrap gap-4">
                {hosts.map((host) => (
                  <Link
                    key={host.id}
                    href={host.nickname ? `/@${host.nickname}` : '#'}
                    className="flex items-center gap-3 rounded-lg group"
                  >
                    <Avatar
                      avatarUrl={host.avatar_url}
                      fullName={host.full_name}
                      size="md"
                      hoverEffect
                    />
                    <div>
                      <p className="font-medium group-hover:text-primary transition-colors">
                        {host.full_name || 'Host'}
                      </p>
                      {host.nickname && (
                        <p className="text-sm opacity-70 group-hover:opacity-100 group-hover:text-primary transition-colors">
                          @{host.nickname}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Description Section */}
          {event.description && (
            <div className="mb-8">
              <h2 className="mb-3 text-lg font-semibold">About this event</h2>
              <p className="whitespace-pre-line text-foreground/90 leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Add to Calendar */}
          {!isPastEvent && (
            <div className="mb-8">
              <AddToCalendar event={event} />
            </div>
          )}

          {/* Attendees Section */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Attendees</h2>
            <Suspense fallback={<AttendeesLoading />}>
              <Attendees event={event} supabase={supabase} />
            </Suspense>
          </div>
        </Container>
      </PageContainer>

      {/* Sticky Action Bar */}
      {/* TODO: Remove isPastEvent condition once testing is complete */}
      <EventSignupBar event={event} />

      {/* Comments Section - Coming Soon */}
      <PageContainer variant="alt" className="border-t border-t-border-color">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-semibold opacity-50">Comments</h2>
          <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium opacity-50">
            Coming soon
          </span>
        </div>
        <p className="text-sm opacity-40">
          Comments for events will be available in a future update.
        </p>
      </PageContainer>


    </>
  )
}
