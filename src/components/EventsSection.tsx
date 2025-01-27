import Events, { EventsLoading } from "@/components/EventsList";
import { eventDateFilter, EventDateFilterType } from "@/types/events";
import Link from "next/link";

import { Suspense } from 'react';

export default function EventsSection({ filter }: { filter?: EventDateFilterType}) {
  if (!filter || !eventDateFilter.includes(filter)) {
    filter = 'upcoming';
  }

  const title = filter === 'past' ? 'Past meetups' : 'Upcoming meetups';
  const linkText = filter === 'past' ? 'Upcoming meetups' : 'Past meetups';

  return (
    <section
      className="flex justify-center bg-background px-6 pb-10 pt-8 text-foreground sm:p-12 sm:pb-14"
    >
      <div className="w-full max-w-screen-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold leading-tight opacity-70">{title}</h2>
          <Link href={filter === 'past' ? '/' : '/past-meetups'} className="underline underline-offset-2 opacity-70">{linkText}</Link>
        </div>
        <div className="grid gap-6">
          <Suspense fallback={<EventsLoading />}>
            <Events filter={filter} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
