import EventCard, { isEventPast, type EventCardData } from './EventCard';

interface RecentEventsListProps {
  events: EventCardData[];
  /**
   * Maximum number of events to display
   * @default 3
   */
  max?: number;
  /**
   * Server timestamp for determining if events are past.
   * REQUIRED when using Cache Components to avoid Date.now() during render.
   */
  serverNow: number;
}

export default function RecentEventsList({ events, max = 3, serverNow }: RecentEventsListProps) {
  if (!events || events.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-border-color p-6 text-center"
      >
        <p
          className="text-foreground/70"
        >
          No events yet. Check back soon!
        </p>
      </div>
    );
  }

  // Sort events: upcoming first (soonest to latest), then past (most recent to oldest)
  const sortedEvents = [...events]
    .sort((a, b) => {
      const aDate = a.date ? new Date(a.date) : null;
      const bDate = b.date ? new Date(b.date) : null;
      const aIsPast = isEventPast(a.date, serverNow);
      const bIsPast = isEventPast(b.date, serverNow);

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
    <div
      className="space-y-3"
    >
      {sortedEvents.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          showBadge
          description={event.description}
          serverNow={serverNow}
        />
      ))}
    </div>
  );
}
