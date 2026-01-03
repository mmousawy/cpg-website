import Events, { EventsLoading } from "@/components/events/EventsList";
import { eventDateFilter, EventDateFilterType } from "@/types/events";
import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import { Suspense } from 'react';

export default function EventsSection({ filter }: { filter?: EventDateFilterType}) {
  if (!filter || !eventDateFilter.includes(filter)) {
    filter = 'upcoming';
  }

  const title = filter === 'past' ? 'Past meetups' : 'Upcoming meetups';
  const linkText = filter === 'past' ? 'Upcoming meetups' : 'Past meetups';

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold leading-tight opacity-70">{title}</h2>
        <Link href="/events" className="underline underline-offset-2 opacity-70">All events</Link>
      </div>
      <div className="grid gap-6">
        <Suspense fallback={<EventsLoading />}>
          <Events filter={filter} />
        </Suspense>
      </div>
    </PageContainer>
  );
}
