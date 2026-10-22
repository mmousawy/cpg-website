import type { Map } from 'leaflet';
import L from 'leaflet';

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Keyless OpenStreetMap raster tiles (same in light and dark app themes). */
export function addMapTileLayer(map: Map): L.TileLayer {
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: OSM_ATTRIBUTION,
    maxZoom: 19,
  }).addTo(map);
}
