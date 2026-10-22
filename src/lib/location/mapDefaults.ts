import type { LatLngLiteral } from 'leaflet';

/** Rotterdam city center (Coolsingel / Stadhuis). */
export const ROTTERDAM_CENTER: LatLngLiteral = { lat: 51.9225, lng: 4.47917 };

/** When no GPS is set yet — enough context to pan to a neighborhood. */
export const DEFAULT_MAP_ZOOM = 12;

/** When opening on existing coordinates — street-level placement. */
export const EXISTING_COORD_MAP_ZOOM = 16;

/** After picking a place from search. */
export const SEARCH_RESULT_MAP_ZOOM = 16;

export function parseMapCenter(latitude: string, longitude: string): LatLngLiteral {
  if (!hasValidMapCoords(latitude, longitude)) {
    return ROTTERDAM_CENTER;
  }
  return {
    lat: Number(latitude.trim()),
    lng: Number(longitude.trim()),
  };
}

export function hasValidMapCoords(latitude: string, longitude: string): boolean {
  const latStr = latitude.trim();
  const lngStr = longitude.trim();
  if (!latStr || !lngStr) {
    return false;
  }
  const lat = Number(latStr);
  const lng = Number(lngStr);
  return (
    Number.isFinite(lat)
    && Number.isFinite(lng)
    && Math.abs(lat) <= 90
    && Math.abs(lng) <= 180
  );
}

export function initialMapZoom(latitude: string, longitude: string): number {
  return hasValidMapCoords(latitude, longitude) ? EXISTING_COORD_MAP_ZOOM : DEFAULT_MAP_ZOOM;
}
