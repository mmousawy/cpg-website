import PageContainer from '@/components/layout/PageContainer'
import { EventsLoading } from '@/components/events/EventsList'

export default function Loading() {
  return (
    <PageContainer>
      <div className="mb-8">
        <div className="h-9 w-32 animate-pulse rounded bg-border-color" />
        <div className="mt-2 h-5 w-64 animate-pulse rounded bg-border-color" />
      </div>

      <div className="space-y-10">
        <section>
          <div className="h-6 w-24 animate-pulse rounded bg-border-color mb-4" />
          <EventsLoading />
        </section>

        <section>
          <div className="h-6 w-28 animate-pulse rounded bg-border-color mb-4" />
          <EventsLoading />
        </section>
      </div>
    </PageContainer>
  )
}


