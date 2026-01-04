import { Suspense } from 'react'
import PageContainer from '@/components/layout/PageContainer'
import Events, { EventsLoading } from '@/components/events/EventsList'

export const revalidate = 60

export default function EventsPage() {
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
            <Suspense fallback={<EventsLoading />}>
              <Events filter="upcoming" emptyMessage="No upcoming events scheduled. Check back soon!" />
            </Suspense>
          </div>
        </section>

        {/* Past Events */}
        <section>
          <h2 className="text-lg font-semibold mb-4 opacity-70">Past events</h2>
          <div className="grid gap-4 sm:gap-6">
            <Suspense fallback={<EventsLoading />}>
              <Events filter="past" />
            </Suspense>
          </div>
        </section>
      </div>
    </PageContainer>
  )
}


