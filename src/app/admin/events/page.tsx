'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

import type { Tables } from '@/database.types'
import { createClient } from '@/utils/supabase/client'
import Container from '@/components/layout/Container'
import PageContainer from '@/components/layout/PageContainer'
import Button from '@/components/shared/Button'
import SadSVG from 'public/icons/sad.svg'
import CalendarSVG from 'public/icons/calendar2.svg'
import LocationSVG from 'public/icons/location.svg'
import TimeSVG from 'public/icons/time.svg'
import PlusSVG from 'public/icons/plus.svg'

type Event = Pick<Tables<'events'>, 'id' | 'slug' | 'title' | 'date' | 'time' | 'location' | 'description' | 'cover_image'>

export default function AdminEventsPage() {
  // Admin access is guaranteed by ProtectedRoute layout with requireAdmin
  const supabase = createClient()

  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('id, slug, title, date, time, location, description, cover_image')
      .order('date', { ascending: false })

    setEvents(data || [])
    setIsLoading(false)
  }

  const upcomingEvents = events.filter(e => e.date && new Date(e.date) >= new Date())
  const pastEvents = events.filter(e => e.date && new Date(e.date) < new Date())

  return (
    <PageContainer>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Manage events</h1>
          <p className="text-lg opacity-70">
            Create, edit, and delete events
          </p>
        </div>
        <Button
          href="/admin/events/new"
          icon={<PlusSVG className="h-5 w-5" />}
          variant="primary"
        >
          Create event
        </Button>
      </div>

      {isLoading ? (
        <Container className="text-center animate-pulse">
          <p className="text-foreground/50">Loading events...</p>
        </Container>
      ) : events.length === 0 ? (
        <Container variant="centered" className="min-h-64">
          <div className="text-center">
            <SadSVG className="mb-4 inline-block h-12 w-12 fill-foreground/50" />
            <p className="mb-4 text-foreground/80">No events yet</p>
            <Button href="/admin/events/new" icon={<PlusSVG className="h-5 w-5" />}>
              Create your first event
            </Button>
          </div>
        </Container>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold opacity-70">Upcoming events</h2>
              <Container>
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <Link key={event.id} href={`/admin/events/${event.slug || event.id}`}>
                      <div className="rounded-lg border border-border-color p-4 transition-colors hover:border-primary/50 cursor-pointer">
                        <div className="flex items-start gap-4">
                          {event.cover_image && (
                            <div className="relative h-20 w-32 flex-shrink-0 overflow-hidden rounded-lg">
                              <Image
                                src={event.cover_image}
                                alt={event.title || 'Event cover'}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold">{event.title}</h3>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/70">
                              {event.date && (
                                <span className="flex items-center gap-1">
                                  <CalendarSVG className="h-4 w-4 fill-foreground/70" />
                                  {new Date(event.date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                              {event.time && (
                                <span className="flex items-center gap-1">
                                  <TimeSVG className="h-4 w-4 fill-foreground/70" />
                                  {event.time.substring(0, 5)}
                                </span>
                              )}
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <LocationSVG className="h-4 w-4 fill-foreground/70" />
                                  {event.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Container>
            </div>
          )}

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold opacity-70">Past events</h2>
              <Container>
                <div className="space-y-3">
                  {pastEvents.map((event) => (
                    <Link className='block' key={event.id} href={`/admin/events/${event.slug || event.id}`}>
                      <div className="rounded-lg border border-border-color p-4 transition-all cursor-pointer">
                        <div className="flex items-start gap-4">
                          {event.cover_image && (
                            <div className="relative h-20 w-32 flex-shrink-0 overflow-hidden rounded-lg">
                              <Image
                                src={event.cover_image}
                                alt={event.title || 'Event cover'}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold">{event.title}</h3>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/70">
                              {event.date && (
                                <span className="flex items-center gap-1">
                                  <CalendarSVG className="h-4 w-4 fill-foreground/70" />
                                  {new Date(event.date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                              {event.time && (
                                <span className="flex items-center gap-1">
                                  <TimeSVG className="h-4 w-4 fill-foreground/70" />
                                  {event.time.substring(0, 5)}
                                </span>
                              )}
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <LocationSVG className="h-4 w-4 fill-foreground/70" />
                                  {event.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Container>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  )
}
