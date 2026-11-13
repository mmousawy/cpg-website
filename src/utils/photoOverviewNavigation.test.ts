import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearPhotoOverviewPath,
  getPhotoBackLabel,
  getPhotoOverviewPath,
  isPhotoDetailPath,
  setPhotoOverviewPath,
  syncPhotoOverviewOnRouteChange,
} from '@/utils/photoOverviewNavigation';

describe('isPhotoDetailPath', () => {
  it('matches photo detail routes', () => {
    expect(isPhotoDetailPath('/@alice/photo/abc')).toBe(true);
    expect(isPhotoDetailPath('/@alice/album/summer/photo/abc')).toBe(true);
    expect(isPhotoDetailPath('/events/walk/photo/abc')).toBe(true);
    expect(isPhotoDetailPath('/challenges/winter/photo/abc')).toBe(true);
  });

  it('does not match overview or unrelated routes', () => {
    expect(isPhotoDetailPath('/@alice')).toBe(false);
    expect(isPhotoDetailPath('/gallery/photos')).toBe(false);
    expect(isPhotoDetailPath('/@alice/album/summer')).toBe(false);
  });
});

describe('getPhotoBackLabel', () => {
  it('derives section labels from overview path', () => {
    expect(getPhotoBackLabel({ overviewPath: '/gallery/photos', fallbackLabel: 'X' }).text).toBe('Back to community photos');
    expect(getPhotoBackLabel({ overviewPath: '/', fallbackLabel: 'X' }).text).toBe('Back to home');
    expect(getPhotoBackLabel({ overviewPath: '/gallery/tag/street', fallbackLabel: 'X' }).text).toBe('Back to tag');
    expect(getPhotoBackLabel({ overviewPath: '/@alice', fallbackLabel: 'X' }).text).toBe('Back to photostream');
    expect(getPhotoBackLabel({ overviewPath: '/@alice/album/summer', fallbackLabel: 'X' }).text).toBe('Back to album');
  });

  it('uses fallback section label when overview is absent', () => {
    expect(getPhotoBackLabel({ overviewPath: null, fallbackLabel: 'photostream' }).text).toBe('Back to photostream');
  });

  it('falls back to plain Back for unknown overview', () => {
    expect(getPhotoBackLabel({ overviewPath: '/account/photos', fallbackLabel: 'X' }).text).toBe('Back');
  });
});

describe('syncPhotoOverviewOnRouteChange', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {});
    const store = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  afterEach(() => {
    clearPhotoOverviewPath();
    vi.unstubAllGlobals();
  });

  it('stores overview when entering a photo from another page', () => {
    syncPhotoOverviewOnRouteChange('/@alice/photo/x', '/gallery/photos', '/gallery/photos?sort=recent');
    expect(getPhotoOverviewPath()).toBe('/gallery/photos?sort=recent');
  });

  it('keeps overview when moving between photos', () => {
    setPhotoOverviewPath('/@alice');
    syncPhotoOverviewOnRouteChange('/@alice/photo/y', '/@alice/photo/x', '/@alice/photo/x');
    expect(getPhotoOverviewPath()).toBe('/@alice');
  });

  it('clears overview when leaving photo routes', () => {
    setPhotoOverviewPath('/gallery');
    syncPhotoOverviewOnRouteChange('/gallery', '/@alice/photo/x', '/@alice/photo/x');
    expect(getPhotoOverviewPath()).toBeNull();
  });
});
