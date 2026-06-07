export function formatLocation(
  locationName: string | null,
  locationCity: string,
  cityOnly = false,
): string {
  const name = locationName?.trim();
  const city = locationCity.trim();

  const stripPostalCodePrefix = (value: string): string =>
    value
      // NL postal code: 1234 AB City
      .replace(/^\d{4}\s?[A-Za-z]{2}[\s,.-]*/u, '')
      // Generic numeric prefix fallback: 3131 City
      .replace(/^\d+[\s,.-]*/u, '')
      .trim();

  const cityFromName = (): string => {
    if (!name) {
      return '';
    }

    const lines = name
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
    const lastLine = lines.at(-1) ?? '';
    return stripPostalCodePrefix(lastLine);
  };

  if (cityOnly) {
    const cleanedCity = stripPostalCodePrefix(city);
    return cleanedCity || cityFromName() || '';
  }

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
