import { describe, expect, it } from 'vitest';

import { formatEventLocation, parseEventLocation } from './formatLocation';

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
