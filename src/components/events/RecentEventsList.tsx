import EventCard, { type EventCardData, isEventPast } from './EventCard';

interface RecentEventsListProps {
  events: EventCardData[];
  /**
   * Maximum number of events to display
   * @default 3
   */
  max?: number;
}

export default function RecentEventsList({ events, max = 3 }: RecentEventsListProps) {
  if (!events || events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-color p-6 text-center">
        <p className="text-foreground/70">No events yet. Check back soon!</p>
      </div>
    );
  }

  // Sort events: upcoming first (soonest to latest), then past (most recent to oldest)
  const sortedEvents = [...events]
    .sort((a, b) => {
      const aDate = a.date ? new Date(a.date) : null;
      const bDate = b.date ? new Date(b.date) : null;
      const aIsPast = isEventPast(a.date);
      const bIsPast = isEventPast(b.date);

      // Upcoming events come first
      if (!aIsPast && bIsPast) return -1;
      if (aIsPast && !bIsPast) return 1;

      // Both upcoming: soonest first (ascending)
      if (!aIsPast && !bIsPast) {
        return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
      }

      // Both past: most recent first (descending)
      return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
    })
    .slice(0, max);

  return (
    <div className="space-y-3">
      {sortedEvents.map((event) => (
        <EventCard key={event.id} event={event} showBadge />
      ))}
    </div>
  );
}
