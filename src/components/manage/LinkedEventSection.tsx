import EventMiniCard from '@/components/events/EventMiniCard';
import type { AlbumWithPhotos } from '@/types/albums';

interface LinkedEventSectionProps {
  album: Pick<
    AlbumWithPhotos,
    'event_slug' | 'event_title' | 'event_cover_image' | 'event_date'
  > | null;
}

/**
 * Sidebar section showing the event linked to an event album,
 * matching the "In albums" mini-card pattern used on photos.
 */
export default function LinkedEventSection({ album }: LinkedEventSectionProps) {
  if (!album?.event_slug) return null;

  const eventHref = `/events/${album.event_slug}`;

  return (
    <>
      <hr
        className="my-4 border-border-color"
      />
      <div>
        <h3
          className="mb-2 text-sm font-medium"
        >
          Linked event:
        </h3>
        <EventMiniCard
          title={album.event_title || 'Event'}
          coverImageUrl={album.event_cover_image}
          href={eventHref}
          date={album.event_date}
        />
      </div>
    </>
  );
}
