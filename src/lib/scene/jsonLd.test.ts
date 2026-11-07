import { describe, expect, it } from 'vitest';

import { buildSceneEventJsonLd, getSceneEventSchemaDates } from './jsonLd';

function sceneEvent(overrides: Partial<Parameters<typeof buildSceneEventJsonLd>[0]> = {}) {
  return {
    title: 'Kunsthal show',
    start_date: '2026-04-26',
    end_date: '2026-04-26',
    start_time: '13:00:00',
    end_time: '17:00:00',
    location_name: 'Kunsthal',
    location_city: 'Rotterdam',
    location_address: 'Westzeedijk 341',
    url: 'https://kunsthal.nl/show',
    description: '<p>A photography exhibition.</p>',
    organizer: 'Kunsthal Rotterdam',
    price_info: 'Free',
    cover_image_url: null,
    ...overrides,
  };
}

describe('getSceneEventSchemaDates', () => {
  it('uses Amsterdam offsets when times are present', () => {
    expect(getSceneEventSchemaDates(sceneEvent())).toEqual({
      startDate: '2026-04-26T13:00:00+02:00',
      endDate: '2026-04-26T17:00:00+02:00',
    });
  });

  it('emits date-only values when times are missing', () => {
    expect(getSceneEventSchemaDates(sceneEvent({
      start_time: null,
      end_time: null,
      end_date: '2026-04-28',
    }))).toEqual({
      startDate: '2026-04-26',
      endDate: '2026-04-28',
    });
  });
});

describe('buildSceneEventJsonLd', () => {
  it('includes a structured address, organizer, and free offer url', () => {
    const jsonLd = buildSceneEventJsonLd(
      sceneEvent(),
      'https://example.com/scene/kunsthal-show',
    );

    expect(jsonLd.location).toMatchObject({
      '@type': 'Place',
      name: 'Kunsthal',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Westzeedijk 341',
        addressLocality: 'Rotterdam',
      },
    });
    expect(jsonLd.organizer).toEqual({
      '@type': 'Organization',
      name: 'Kunsthal Rotterdam',
    });
    expect(jsonLd.isAccessibleForFree).toBe(true);
    expect(jsonLd.offers).toMatchObject({
      url: 'https://kunsthal.nl/show',
      price: 0,
    });
  });
});
