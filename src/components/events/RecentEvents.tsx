import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/server'
import type { CPGEvent } from '@/types/events'

import CalendarSVG from 'public/icons/calendar2.svg'
import LocationSVG from 'public/icons/location.svg'
import TimeSVG from 'public/icons/time.svg'

export default async function RecentEvents() {
  const supabase = await createClient()

  // Fetch 3 most recent events by date (descending)
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, date, location, time, cover_image, slug')
    .order('date', { ascending: false })
    .limit(3)

  if (error || !events || events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-color p-6 text-center">
        <p className="text-foreground/70">No events yet. Check back soon!</p>
      </div>
    )
  }

  // Check which events are past/upcoming
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const eventsWithStatus = events.map((event) => {
    const eventDate = event.date ? new Date(event.date) : null
    if (eventDate) eventDate.setHours(0, 0, 0, 0)
    const isPast = eventDate ? eventDate < now : false
    
    return { ...event, isPast }
  })

  return (
    <div className="space-y-3">
      {eventsWithStatus.map((event) => (
        <Link 
          key={event.id} 
          href={`/events/${event.slug}`}
          className="block rounded-xl border border-border-color bg-background p-3 sm:p-4 transition-colors hover:border-primary group"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Thumbnail */}
            {event.cover_image && (
              <div className="relative h-16 w-24 sm:h-20 sm:w-32 shrink-0 overflow-hidden rounded-lg bg-background-light">
                <Image
                  src={event.cover_image}
                  alt={event.title || 'Event cover'}
                  sizes="128px"
                  loading='eager'
                  quality={95}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h4 className="font-semibold group-hover:text-primary transition-colors line-clamp-3">
                  {event.title}
                </h4>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  event.isPast 
                    ? 'bg-foreground/10 text-foreground/60' 
                    : 'bg-primary/10 text-primary'
                }`}>
                  {event.isPast ? 'Past' : 'Upcoming'}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-foreground/70">
                {event.date && (
                  <span className="flex items-center gap-1">
                    <CalendarSVG className="size-3.5 fill-foreground/60" />
                    {new Date(event.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                )}
                {event.time && (
                  <span className="flex items-center gap-1">
                    <TimeSVG className="size-3.5 fill-foreground/60" />
                    {event.time.substring(0, 5)}
                  </span>
                )}
                {event.location && (
                  <span className="hidden sm:flex items-center gap-1">
                    <LocationSVG className="size-3.5 fill-foreground/60" />
                    <span className="line-clamp-1">{event.location.split('\n')[0]}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

export function RecentEventsLoading() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border-color bg-background p-4">
          <div className="flex items-start gap-4">
            <div className="h-20 w-32 shrink-0 animate-pulse rounded-lg bg-border-color" />
            <div className="flex-1">
              <div className="h-5 w-48 animate-pulse rounded bg-border-color mb-2" />
              <div className="h-4 w-32 animate-pulse rounded bg-border-color" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
