import { describe, expect, it } from 'vitest';

import { buildEventJsonLd } from './jsonLd';

describe('buildEventJsonLd', () => {
  it('includes timezone, postal address, free offer, and a 3-hour end', () => {
    const jsonLd = buildEventJsonLd({
      title: 'Photo walk',
      description: '<p>Bring a camera.</p>',
      url: 'https://example.com/events/photo-walk',
      date: '2026-04-26',
      time: '13:00',
      location: 'The Villy\nGaffelstraat 61\n3014 RE Rotterdam',
      coverImage: 'https://cdn.example.com/cover.jpg',
      attendeeCount: 10,
      maxAttendees: 20,
    });

    expect(jsonLd.startDate).toBe('2026-04-26T13:00:00+02:00');
    expect(jsonLd.endDate).toBe('2026-04-26T16:00:00+02:00');
    expect(jsonLd.isAccessibleForFree).toBe(true);
    expect(jsonLd.offers).toMatchObject({
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    });
    expect(jsonLd.location).toMatchObject({
      '@type': 'Place',
      name: 'The Villy',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Gaffelstraat 61',
        postalCode: '3014 RE',
        addressLocality: 'Rotterdam',
        addressCountry: 'NL',
      },
    });
    expect(jsonLd.image).toBe('https://cdn.example.com/cover.jpg');
  });

  it('uses a date-only startDate when time is missing', () => {
    const jsonLd = buildEventJsonLd({
      title: 'Open day',
      url: 'https://example.com/events/open-day',
      date: '2026-11-21',
    });

    expect(jsonLd.startDate).toBe('2026-11-21');
    expect(jsonLd.endDate).toBeUndefined();
  });

  it('marks the offer SoldOut when attendance is full', () => {
    const jsonLd = buildEventJsonLd({
      title: 'Full meetup',
      url: 'https://example.com/events/full',
      date: '2026-04-26',
      time: '13:00',
      attendeeCount: 12,
      maxAttendees: 12,
    });

    expect(jsonLd.offers.availability).toBe('https://schema.org/SoldOut');
  });
});
