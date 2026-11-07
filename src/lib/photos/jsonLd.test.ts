import { describe, expect, it } from 'vitest';

import { buildImageObjectJsonLd } from './jsonLd';

describe('buildImageObjectJsonLd', () => {
  it('adds license metadata and a Person @id', () => {
    const jsonLd = buildImageObjectJsonLd({
      name: 'Harbour',
      description: 'Rotterdam at dusk',
      contentUrl: 'https://cdn.example.com/harbour.jpg',
      pageUrl: 'https://creativephotographygroup.com/@ada/photo/abc',
      creatorNickname: 'ada',
      creatorName: 'Ada',
      dateCreated: '2026-04-01T12:00:00.000Z',
      license: 'cc-by-4.0',
      copyrightNotice: '© 2026 Ada. Licensed under CC BY.',
    });

    expect(jsonLd.license).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(jsonLd.acquireLicensePage).toContain('/help/licenses');
    expect(jsonLd.creditText).toBe('Ada');
    expect(jsonLd.copyrightNotice).toBe('© 2026 Ada. Licensed under CC BY.');
    expect(jsonLd.creator).toMatchObject({
      '@type': 'Person',
      '@id': expect.stringContaining('/@ada#person'),
      name: 'Ada',
    });
  });
});
