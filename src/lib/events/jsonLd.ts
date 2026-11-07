import type { CPGEvent } from '@/types/events';
import { getEventSchemaDateTimes } from '@/lib/events/calendarTime';
import { getCrawlableImageUrl, getOrganizationJsonLd } from '@/lib/seo/jsonLd';
import { parseEventLocation } from '@/utils/formatLocation';
import { stripHtml } from '@/utils/stripHtml';

type EventJsonLdInput = {
  title: string;
  description?: string | null;
  url: string;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  coverImage?: string | null;
  attendeeCount?: number;
  maxAttendees?: number | null;
  durationHours?: number;
};

export function buildEventJsonLd(input: EventJsonLdInput) {
  const { startDate, endDate } = getEventSchemaDateTimes(
    input.date,
    input.time,
    input.durationHours ?? 3,
  );
  const description = stripHtml(input.description ?? '')
    || `Join us for ${input.title || 'this event'}`;
  const image = getCrawlableImageUrl(input.coverImage);
  const soldOut = input.maxAttendees != null
    && input.maxAttendees > 0
    && (input.attendeeCount ?? 0) >= input.maxAttendees;
  const location = input.location?.trim()
    ? parseEventLocation(input.location)
    : null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: input.title,
    description,
    url: input.url,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(image && { image }),
    organizer: getOrganizationJsonLd(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'EUR',
      url: input.url,
      availability: soldOut
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
    },
    ...(location && {
      location: {
        '@type': 'Place',
        name: location.name,
        address: location.address,
      },
    }),
  };
}

export function buildCpgEventJsonLd(
  event: Pick<
    CPGEvent,
    'title' | 'description' | 'date' | 'time' | 'location' | 'cover_image' | 'max_attendees'
  >,
  eventUrl: string,
  attendeeCount = 0,
) {
  return buildEventJsonLd({
    title: event.title || 'Event',
    description: event.description,
    url: eventUrl,
    date: event.date,
    time: event.time,
    location: event.location,
    coverImage: event.cover_image,
    attendeeCount,
    maxAttendees: event.max_attendees,
  });
}
