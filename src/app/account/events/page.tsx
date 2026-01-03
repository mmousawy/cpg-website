'use client'

import { useState, useEffect } from 'react'
import clsx from 'clsx'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/utils/supabase/client'
import Button from '@/components/shared/Button'
import Container from '@/components/layout/Container'
import PageContainer from '@/components/layout/PageContainer'

import CalendarSVG from 'public/icons/calendar2.svg'
import LocationSVG from 'public/icons/location.svg'
import TimeSVG from 'public/icons/time.svg'
import CancelSVG from 'public/icons/cancel.svg'
import CheckSVG from 'public/icons/check.svg'
import SadSVG from 'public/icons/sad.svg'
import ArrowRightSVG from 'public/icons/arrow-right.svg'

type RSVP = {
  id: number
  uuid: string
  confirmed_at: string | null
  canceled_at: string | null
  attended_at: string | null
  created_at: string
  events: {
    id: number
    title: string
    date: string
    time: string
    location: string
    cover_image: string | null
  }
}

export default function MyEventsPage() {
  // User is guaranteed by ProtectedRoute layout
  const { user } = useAuth()

  const [rsvps, setRsvps] = useState<RSVP[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<number | null>(null)

  useEffect(() => {
    // User is guaranteed by ProtectedRoute layout
    if (!user) return

    const loadRSVPs = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('events_rsvps')
          .select(`
            id,
            uuid,
            confirmed_at,
            canceled_at,
            attended_at,
            created_at,
            events (
              id,
              title,
              date,
              time,
              location,
              cover_image
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading RSVPs:', error)
        } else {
          setRsvps((data as unknown as RSVP[]) || [])
        }
      } catch (err) {
        console.error('Unexpected error loading RSVPs:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadRSVPs()
  }, [user])

  const handleCancel = async (rsvp: RSVP) => {
    if (!confirm('Are you sure you want to cancel this RSVP?')) return

    setCancellingId(rsvp.id)

    try {
      const result = await fetch('/api/cancel', {
        method: 'POST',
        body: JSON.stringify({ uuid: rsvp.uuid }),
        headers: { 'Content-Type': 'application/json' },
      })

      if (result.ok && user) {
        // Reload RSVPs
        const supabase = createClient()
        const { data } = await supabase
          .from('events_rsvps')
          .select(`
            id,
            uuid,
            confirmed_at,
            canceled_at,
            attended_at,
            created_at,
            events (
              id,
              title,
              date,
              time,
              location,
              cover_image
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (data) {
          setRsvps((data as unknown as RSVP[]) || [])
        }
      }
    } finally {
      setCancellingId(null)
    }
  }


  const upcomingRSVPs = rsvps.filter(
    r => !r.canceled_at && r.events && new Date(r.events.date) >= new Date()
  )
  const pastRSVPs = rsvps.filter(
    r => !r.canceled_at && r.events && new Date(r.events.date) < new Date()
  )
  const canceledRSVPs = rsvps.filter(r => r.canceled_at)

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">My events</h1>
        <p className="text-lg opacity-70">
          View and manage your event registrations
        </p>
      </div>

      <div className="space-y-8">
        {/* Upcoming Events */}
        <section>
          <h2 className="mb-4 text-lg font-semibold opacity-70">Upcoming events</h2>
          {isLoading ? (
            <Container className="text-center animate-pulse">
              <p className="text-foreground/50">Loading your events...</p>
            </Container>
          ) : upcomingRSVPs.length === 0 ? (
            <Container className="text-center">
              <p className="text-foreground/80"><SadSVG className="inline align-top h-6 w-6 mr-2 fill-foreground/80" /> No upcoming events</p>
              <Button
                href="/"
                size='sm'
                iconRight={<ArrowRightSVG className="-mr-1.5" />}
                className="mt-4 rounded-full"
              >
                Browse events
              </Button>
            </Container>
          ) : (
            <Container>
              <div className="space-y-3">
                {upcomingRSVPs.map((rsvp) => (
                  <EventCard
                    key={rsvp.id}
                    rsvp={rsvp}
                    onCancel={() => handleCancel(rsvp)}
                    isCancelling={cancellingId === rsvp.id}
                  />
                ))}
              </div>
            </Container>
          )}
        </section>

        {/* Past Events */}
        {pastRSVPs.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold opacity-70">Past events</h2>
            <Container>
              <div className="space-y-3">
                {pastRSVPs.map((rsvp) => (
                  <EventCard
                    key={rsvp.id}
                    rsvp={rsvp}
                    isPast
                  />
                ))}
              </div>
            </Container>
          </section>
        )}

        {/* Canceled Events */}
        {canceledRSVPs.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold opacity-70">Canceled RSVPs</h2>
            <Container className="opacity-40">
              <div className="space-y-3">
                {canceledRSVPs.map((rsvp) => (
                  <EventCard key={rsvp.id} rsvp={rsvp} isCanceled />
                ))}
              </div>
            </Container>
          </section>
        )}
      </div>
    </PageContainer>
  )
}

function EventCard({
  rsvp,
  onCancel,
  isCancelling,
  isPast,
  isCanceled,
}: {
  rsvp: RSVP
  onCancel?: () => void
  isCancelling?: boolean
  isPast?: boolean
  isCanceled?: boolean
}) {
  const event = rsvp.events

  if (!event) return null

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border-color p-4">
      <div className="flex-1">
        <h3 className="font-semibold">{event.title}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/70">
          <span className="flex items-center gap-1">
            <CalendarSVG className="h-4 w-4 fill-foreground/70" />
            {new Date(event.date).toLocaleDateString('en-US', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <span className="flex items-center gap-1">
            <TimeSVG className="h-4 w-4 fill-foreground/70" />
            {event.time?.substring(0, 5)}
          </span>
        </div>
        <p className="mt-1 flex items-start gap-1 text-sm text-foreground/60">
          <LocationSVG className="mt-0.5 h-4 w-4 shrink-0 fill-foreground/60" />
          <span className="line-clamp-1">{event.location}</span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        {isCanceled ? (
          <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-500">
            <CancelSVG className="h-3 w-3 fill-red-500" />
            Canceled
          </span>
        ) : isPast ? (
          rsvp.attended_at ? (
            <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600">
              <CheckSVG className="h-3 w-3 fill-green-600" />
              Attended
            </span>
          ) : new Date(event.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) ? (
            <span className="flex items-center gap-1 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-600">
              Pending confirmation
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium text-foreground/60">
              Not attended
            </span>
          )
        ) : (
          <>
            <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600">
              <CheckSVG className="h-3 w-3 fill-green-600" />
              Confirmed
            </span>
            {onCancel && (
              <Button
                onClick={onCancel}
                disabled={isCancelling}
                variant="danger"
                size="sm"
                className="rounded-full"
              >
                {isCancelling ? 'Canceling...' : 'Cancel'}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
