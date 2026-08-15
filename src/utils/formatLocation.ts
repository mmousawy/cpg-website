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

export function getGoogleMapsSearchUrl(location: string): string {
  const query = locationLines(location).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
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
