'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import clsx from 'clsx'

import { useAdmin } from '@/hooks/useAdmin'
import { createClient } from '@/utils/supabase/client'
import Container from '@/components/Container'
import LoadingSpinner from '@/components/LoadingSpinner'
import PageContainer from '@/components/PageContainer'
import SadSVG from 'public/icons/sad.svg'

import CalendarSVG from 'public/icons/calendar2.svg'
import LocationSVG from 'public/icons/location.svg'
import TimeSVG from 'public/icons/time.svg'
import ArrowRightSVG from 'public/icons/arrow-right.svg'
import ArrowRightSVG from 'public/icons/arrow-right.svg'

type Event = {
  id: number
  title: string | null
  date: string | null
  time: string | null
  location: string | null
}

export default function AdminDashboardPage() {
  const { isAdmin, isLoading: adminLoading } = useAdmin()
  const supabase = createClient()

  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!adminLoading) {
      loadEvents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminLoading])

  const loadEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('id, title, date, time, location')
      .order('date', { ascending: false })

    setEvents(data || [])
    setIsLoading(false)
  }

  if (adminLoading || isLoading) {
    return (
      <PageContainer className="items-center justify-center">
        <div className="flex justify-center">
          <LoadingSpinner />
        </div>
      </PageContainer>
    )
  }

  if (!isAdmin) {
    return (
      <PageContainer className="items-center justify-center">
        <Container>
          <h1 className="mb-4 text-2xl font-bold">Access denied</h1>
          <p className="text-foreground/70">You don't have permission to access this page.</p>
        </Container>
      </PageContainer>
    )
  }

  const upcomingEvents = events.filter(e => e.date && new Date(e.date) >= new Date())
  const pastEvents = events.filter(e => e.date && new Date(e.date) < new Date())

  return (
    <PageContainer>
      <h1 className="mb-8 text-3xl font-bold">Admin dashboard</h1>

      <div className="space-y-8">
        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold opacity-70">Upcoming Events</h2>
            <Container>
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}`}
                    className="block rounded-lg border border-border-color p-4 transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{event.title}</h3>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/70">
                          <span className="flex items-center gap-1">
                            <CalendarSVG className="h-4 w-4 fill-foreground/70" />
                            {event.date ? new Date(event.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            }) : 'TBD'}
                          </span>
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
                      <span className="text-sm text-primary">Manage →</span>
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
            <h2 className="mb-4 text-lg font-semibold opacity-70">Past Events</h2>
            <Container>
              <div className="space-y-3">
                {pastEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}`}
                    className="block rounded-lg border border-border-color p-4 transition-colors hover:border-primary hover:bg-primary/5 opacity-75"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{event.title}</h3>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/70">
                          <span className="flex items-center gap-1">
                            <CalendarSVG className="h-4 w-4 fill-foreground/70" />
                            {event.date ? new Date(event.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            }) : 'TBD'}
                          </span>
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
                      <span className="text-sm text-primary">Manage →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </Container>
          </div>
        )}

        {events.length === 0 && (
          <Container className="text-center">
            <p className="text-foreground/80"><SadSVG className="inline align-top h-6 w-6 mr-2 fill-foreground/80" /> No events found</p>
          </Container>
        )}
      </div>
    </PageContainer>
  )
}
