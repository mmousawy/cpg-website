export type PlaceSearchResult = {
  label: string;
  lat: number;
  lng: number;
};

type NominatimSearchHit = {
  lat: string;
  lon: string;
  display_name: string;
};

function nominatimUserAgent(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cpg.photo';
  return `CPG Website (${site}; photo location picker)`;
}

export async function searchPlaces(query: string, limit = 8): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    limit: String(Math.min(Math.max(limit, 1), 10)),
    addressdetails: '0',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': nominatimUserAgent(),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Nominatim search failed (${response.status})`);
  }

  const hits = (await response.json()) as NominatimSearchHit[];
  return hits
    .map((hit) => {
      const lat = Number(hit.lat);
      const lng = Number(hit.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }
      return {
        label: hit.display_name,
        lat,
        lng,
      };
    })
    .filter((row): row is PlaceSearchResult => row != null);
}
