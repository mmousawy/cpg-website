import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MAP_ZOOM,
  EXISTING_COORD_MAP_ZOOM,
  initialMapZoom,
  parseMapCenter,
  ROTTERDAM_CENTER,
} from './mapDefaults';

describe('mapDefaults', () => {
  it('defaults to Rotterdam when coords are missing', () => {
    expect(parseMapCenter('', '')).toEqual(ROTTERDAM_CENTER);
    expect(parseMapCenter('not', 'coords')).toEqual(ROTTERDAM_CENTER);
  });

  it('uses valid coords when provided', () => {
    expect(parseMapCenter('51.5', '4.2')).toEqual({ lat: 51.5, lng: 4.2 });
  });

  it('picks zoom based on whether GPS is already set', () => {
    expect(initialMapZoom('', '')).toBe(DEFAULT_MAP_ZOOM);
    expect(initialMapZoom('51.92', '4.48')).toBe(EXISTING_COORD_MAP_ZOOM);
  });
});
