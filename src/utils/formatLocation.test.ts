import { describe, expect, it } from 'vitest';

import {
  formatEventLocation,
  getGoogleMapsEmbedUrl,
  getGoogleMapsSearchUrl,
  parseEventLocation,
} from './formatLocation';

describe('getGoogleMapsSearchUrl', () => {
  it('builds a Google Maps search link from a multiline address', () => {
    const url = getGoogleMapsSearchUrl('The Villy\nGaffelstraat 61\n3014 RE Rotterdam');
    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query='
      + encodeURIComponent('The Villy, Gaffelstraat 61, 3014 RE Rotterdam'),
    );
  });
});

describe('getGoogleMapsEmbedUrl', () => {
  it('builds an embed URL with output=embed', () => {
    const url = getGoogleMapsEmbedUrl('Rotterdam');
    expect(url).toContain('output=embed');
    expect(url).toContain(encodeURIComponent('Rotterdam'));
  });
});

describe('formatEventLocation', () => {
  it('returns venue and city from a multiline address', () => {
    expect(formatEventLocation('The Villy\nGaffelstraat 61\n3014 RE Rotterdam')).toBe(
      'The Villy, Rotterdam',
    );
  });
});

describe('parseEventLocation', () => {
  it('parses venue, street, postal code, and city', () => {
    expect(parseEventLocation('The Villy\nGaffelstraat 61\n3014 RE Rotterdam')).toEqual({
      name: 'The Villy',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'NL',
        streetAddress: 'Gaffelstraat 61',
        postalCode: '3014 RE',
        addressLocality: 'Rotterdam',
      },
    });
  });

  it('parses venue and city without a street', () => {
    expect(parseEventLocation('Bar Blink\nRotterdam')).toEqual({
      name: 'Bar Blink',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'NL',
        name: 'Bar Blink, Rotterdam',
        addressLocality: 'Rotterdam',
      },
    });
  });

  it('falls back to a one-line PostalAddress.name for a single line', () => {
    expect(parseEventLocation('Rotterdam')).toEqual({
      name: 'Rotterdam',
      address: {
        '@type': 'PostalAddress',
        name: 'Rotterdam',
        addressCountry: 'NL',
      },
    });
  });
});
