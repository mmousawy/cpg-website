function stripPostalCodePrefix(value: string): string {
  return value
    // NL postal code: 1234 AB City
    .replace(/^\d{4}\s?[A-Za-z]{2}[\s,.-]*/u, '')
    // Generic numeric prefix fallback: 3131 City
    .replace(/^\d+[\s,.-]*/u, '')
    .trim();
}

function locationLines(location: string): string[] {
  return location
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function googleMapsQuery(location: string): string {
  return locationLines(location).join(', ');
}

export function getGoogleMapsSearchUrl(location: string): string {
  const query = googleMapsQuery(location);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Google Maps share embed. Uses the address text and does not need an API key. */
export function getGoogleMapsEmbedUrl(location: string): string | null {
  const query = googleMapsQuery(location);
  if (!query) {
    return null;
  }

  const params = new URLSearchParams({
    q: query,
    z: '15',
    output: 'embed',
  });

  return `https://www.google.com/maps?${params.toString()}`;
}

/** Compact "Venue, City" from a CPG multiline address, for event cards. */
export function formatEventLocation(location: string | null | undefined): string {
  if (!location) {
    return '';
  }

  const lines = locationLines(location);
  if (lines.length === 0) {
    return location.trim();
  }

  const venue = lines[0] ?? '';
  const lastLine = lines.at(-1) ?? '';
  const city = stripPostalCodePrefix(lastLine);

  if (!city || venue.toLocaleLowerCase().includes(city.toLocaleLowerCase())) {
    return venue;
  }

  return `${venue}, ${city}`;
}

const NL_POSTAL_WITH_CITY = /^(\d{4}\s?[A-Za-z]{2})(?:\s+|,\s*)(.+)$/;
const NL_POSTAL_ONLY = /^(\d{4}\s?[A-Za-z]{2})$/;

function normalizeNlPostal(value: string): string {
  const compact = value.replace(/\s+/g, '');
  const match = compact.match(/^(\d{4})([A-Za-z]{2})$/);
  if (!match) return value.trim();
  return `${match[1]} ${match[2].toUpperCase()}`;
}

function parseNlPostalCity(line: string): { postalCode?: string; city?: string } {
  const withCity = line.match(NL_POSTAL_WITH_CITY);
  if (withCity) {
    return {
      postalCode: normalizeNlPostal(withCity[1] ?? ''),
      city: withCity[2]?.trim(),
    };
  }

  const postalOnly = line.match(NL_POSTAL_ONLY);
  if (postalOnly) {
    return { postalCode: normalizeNlPostal(postalOnly[1] ?? '') };
  }

  return {};
}

export type EventPostalAddress = {
  '@type': 'PostalAddress';
  addressCountry: 'NL';
  name?: string;
  streetAddress?: string;
  postalCode?: string;
  addressLocality?: string;
};

/** Venue name plus a PostalAddress parsed from a CPG multiline location string. */
export function parseEventLocation(location: string): {
  name: string;
  address: EventPostalAddress;
} {
  const lines = locationLines(location);
  const venue = lines[0] ?? location.trim();
  const rest = lines.slice(1);
  const oneLine = lines.join(', ') || venue;

  if (rest.length === 0) {
    return {
      name: venue,
      address: {
        '@type': 'PostalAddress',
        name: venue,
        addressCountry: 'NL',
      },
    };
  }

  const last = rest[rest.length - 1] ?? '';
  const parsedLast = parseNlPostalCity(last);
  const cityFromLast = parsedLast.city
    || (!parsedLast.postalCode && !/\d/.test(last) ? last : undefined);
  const streetLines = parsedLast.postalCode || cityFromLast
    ? rest.slice(0, -1)
    : rest;
  const streetAddress = streetLines.join(', ') || undefined;

  const address: EventPostalAddress = {
    '@type': 'PostalAddress',
    addressCountry: 'NL',
  };

  if (streetAddress) address.streetAddress = streetAddress;
  if (cityFromLast) address.addressLocality = cityFromLast;
  if (parsedLast.postalCode) address.postalCode = parsedLast.postalCode;

  if (!streetAddress || !cityFromLast) {
    address.name = oneLine;
  }

  return { name: venue, address };
}

export function formatLocation(
  locationName: string | null,
  locationCity: string,
): string {
  const name = locationName?.trim();
  const city = locationCity.trim();

  if (name) {
    const normalizedName = name.toLocaleLowerCase();
    const normalizedCity = city.toLocaleLowerCase();

    if (!city || normalizedName.includes(normalizedCity)) {
      return name;
    }

    return `${name}, ${city}`;
  }

  return city;
}
