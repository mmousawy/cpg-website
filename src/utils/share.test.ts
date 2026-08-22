import { describe, expect, it } from 'vitest';

import {
  formatShareTitle,
  getPhotoSharePath,
  getShareLinks,
} from '@/utils/share';

describe('formatShareTitle', () => {
  it('appends the site name to the page title', () => {
    expect(formatShareTitle('Photo Walk')).toBe('Photo Walk - Creative Photography Group');
  });

  it('returns only the site name when the page title is empty', () => {
    expect(formatShareTitle('  ')).toBe('Creative Photography Group');
  });
});

describe('getShareLinks', () => {
  const base = {
    url: 'https://creativephotographygroup.com/@jane/photo/abc',
    title: 'Sunset',
    text: 'Sunset by @jane',
  };

  it('builds Facebook, X, and WhatsApp intent URLs', () => {
    const links = getShareLinks(base);

    expect(links.facebook).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(base.url),
    );
    expect(links.x).toContain('twitter.com/intent/tweet');
    expect(links.x).toContain(encodeURIComponent(base.url));
    expect(links.x).toContain(encodeURIComponent(base.text));
    expect(links.whatsapp).toContain('wa.me');
    expect(links.whatsapp).toContain(encodeURIComponent(`${base.text} ${base.url}`));
  });

  it('includes Pinterest when an image URL is provided', () => {
    const image = 'https://example.com/photo.jpg';
    const links = getShareLinks({ ...base, image });

    expect(links.pinterest).toContain('pinterest.com/pin/create/button');
    expect(links.pinterest).toContain(encodeURIComponent(image));
  });

  it('omits Pinterest when no image URL is provided', () => {
    const links = getShareLinks(base);

    expect(links.pinterest).toBeUndefined();
  });

  it('falls back to title for share text when text is omitted', () => {
    const links = getShareLinks({
      url: base.url,
      title: 'My Event',
    });

    expect(links.x).toContain(encodeURIComponent('My Event'));
    expect(links.whatsapp).toContain(encodeURIComponent('My Event'));
  });
});

describe('getPhotoSharePath', () => {
  const nickname = 'jane';
  const shortId = 'abc123';

  it('returns standalone photo path by default', () => {
    expect(getPhotoSharePath({ nickname, shortId })).toBe('/@jane/photo/abc123');
  });

  it('returns album-context photo path', () => {
    expect(getPhotoSharePath({ nickname, shortId, albumSlug: 'italy' })).toBe(
      '/@jane/album/italy/photo/abc123',
    );
  });

  it('returns challenge-context photo path', () => {
    expect(getPhotoSharePath({ nickname, shortId, challengeSlug: 'color' })).toBe(
      '/challenges/color/photo/abc123',
    );
  });

  it('returns event-context photo path', () => {
    expect(getPhotoSharePath({ nickname, shortId, eventSlug: 'walk' })).toBe(
      '/events/walk/photo/abc123',
    );
  });

  it('prefers challenge over album and event when multiple contexts are set', () => {
    expect(
      getPhotoSharePath({
        nickname,
        shortId,
        albumSlug: 'italy',
        challengeSlug: 'color',
        eventSlug: 'walk',
      }),
    ).toBe('/challenges/color/photo/abc123');
  });
});
