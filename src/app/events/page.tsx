import { createClient } from '@/utils/supabase/server'
import PageContainer from '@/components/layout/PageContainer'
import EventsList from '@/components/events/EventsList'
import type { CPGEvent } from '@/types/events'

export const revalidate = 60

export default async function EventsPage() {
  const supabase = await createClient()

  // Fetch all events
  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, date, location, time, cover_image, created_at, image_blurhash, image_height, image_url, image_width, max_attendees, rsvp_count, slug')
    .order('date', { ascending: true })
    .limit(30)

  const allEvents = (events || []) as CPGEvent[]

  // Filter events
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const upcomingEvents = allEvents
    .filter((event) => {
      const eventDate = new Date(event.date!)
      eventDate.setHours(0, 0, 0, 0)
      return eventDate >= now
    })
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())

  const pastEvents = allEvents
    .filter((event) => {
      const eventDate = new Date(event.date!)
      eventDate.setHours(0, 0, 0, 0)
      return eventDate < now
    })
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())

  // Fetch attendees for all events in parallel
  const eventIds = allEvents.map(e => e.id)
  const { data: allAttendees } = await supabase
    .from('events_rsvps')
    .select(`
      id,
      event_id,
      user_id,
      email,
      confirmed_at,
      profiles (avatar_url)
    `)
    .in('event_id', eventIds)
    .not('confirmed_at', 'is', null)
    .is('canceled_at', null)
    .order('confirmed_at', { ascending: true })
    .limit(500)

  // Define attendee type for the component
  type Attendee = {
    id: string
    event_id: number
    user_id: string | null
    email: string
    confirmed_at: string
    profiles: { avatar_url: string | null } | null
  }

  // Group attendees by event
  const attendeesByEvent = (allAttendees || []).reduce((acc, attendee) => {
    const eventId = attendee.event_id
    if (eventId === null) return acc
    if (!acc[eventId]) acc[eventId] = []
    acc[eventId].push({
      id: String(attendee.id),
      event_id: eventId,
      user_id: attendee.user_id,
      email: attendee.email || '',
      confirmed_at: attendee.confirmed_at || '',
      profiles: attendee.profiles
    })
    return acc
  }, {} as Record<number, Attendee[]>)

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="mt-2 text-foreground/70">
          Join us at our upcoming meetups or browse past events
        </p>
      </div>

      <div className="space-y-10">
        {/* Upcoming Events */}
        <section>
          <h2 className="text-lg font-semibold mb-4 opacity-70">Upcoming</h2>
          <div className="grid gap-4 sm:gap-6">
            <EventsList 
              events={upcomingEvents} 
              attendeesByEvent={attendeesByEvent}
              emptyMessage="No upcoming events scheduled. Check back soon!" 
            />
          </div>
        </section>

        {/* Past Events */}
        <section>
          <h2 className="text-lg font-semibold mb-4 opacity-70">Past events</h2>
          <div className="grid gap-4 sm:gap-6">
            <EventsList 
              events={pastEvents} 
              attendeesByEvent={attendeesByEvent}
            />
          </div>
        </section>
      </div>
    </PageContainer>
  )
}





