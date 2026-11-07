import type { SceneEvent } from '@/types/scene';
import { toAmsterdamIsoDateTime } from '@/lib/events/calendarTime';
import { getCrawlableImageUrl } from '@/lib/seo/jsonLd';
import { stripHtml } from '@/utils/stripHtml';

function isSceneEventFree(priceInfo: string | null | undefined): boolean {
  if (!priceInfo?.trim()) return false;
  const trimmed = priceInfo.trim().toLowerCase();
  if (/^(free|gratis)$/.test(trimmed)) return true;
  const numMatch = trimmed.match(/[\d]+([.,][\d]+)?/);
  if (!numMatch) return false;
  return parseFloat(numMatch[0].replace(',', '.')) === 0;
}

export function getSceneEventSchemaDates(event: Pick<
  SceneEvent,
  'start_date' | 'end_date' | 'start_time' | 'end_time'
>): { startDate: string | null; endDate: string | null } {
  const startDate = event.start_time
    ? toAmsterdamIsoDateTime(event.start_date, event.start_time)
    : event.start_date;

  let endDate: string | null = null;
  if (event.end_time) {
    endDate = toAmsterdamIsoDateTime(event.end_date || event.start_date, event.end_time);
  } else if (event.end_date && event.end_date !== event.start_date) {
    endDate = event.end_date;
  }

  return { startDate, endDate };
}

export function buildSceneEventJsonLd(
  event: Pick<
    SceneEvent,
    | 'title'
    | 'description'
    | 'start_date'
    | 'end_date'
    | 'start_time'
    | 'end_time'
    | 'location_name'
    | 'location_city'
    | 'location_address'
    | 'cover_image_url'
    | 'organizer'
    | 'price_info'
    | 'url'
  >,
  pageUrl: string,
) {
  const { startDate, endDate } = getSceneEventSchemaDates(event);
  const image = getCrawlableImageUrl(event.cover_image_url);
  const free = isSceneEventFree(event.price_info);
  const description = stripHtml(event.description ?? '')
    || `${event.title} - ${event.location_name}, ${event.location_city}`;
  const streetAddress = event.location_address?.trim() || undefined;
  const addressLocality = event.location_city.trim();

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description,
    url: pageUrl,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(image && { image }),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(free && { isAccessibleForFree: true }),
    location: {
      '@type': 'Place',
      name: event.location_name,
      address: {
        '@type': 'PostalAddress',
        addressLocality,
        ...(streetAddress && { streetAddress }),
        ...(!streetAddress && {
          name: `${event.location_name}, ${addressLocality}`,
        }),
      },
    },
    ...(event.organizer?.trim() && {
      organizer: {
        '@type': 'Organization',
        name: event.organizer.trim(),
      },
    }),
    ...(event.url && {
      offers: {
        '@type': 'Offer',
        url: event.url,
        ...(free && {
          price: 0,
          priceCurrency: 'EUR',
          availability: 'https://schema.org/InStock',
        }),
      },
    }),
  };
}
