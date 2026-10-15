import { describe, expect, it } from 'vitest';

import {
  matchScrappyCameraIcon,
  scrappyCameraIconFileName,
  scrappyCameraIconUrl,
} from '@/lib/gear/scrappyCameraIcon';

describe('scrappyCameraIcon', () => {
  it('maps known bodies to Flickr icon file names', () => {
    expect(matchScrappyCameraIcon('Canon EOS 60D')).toBe('CanonEOS60D');
    expect(matchScrappyCameraIcon('Canon EOS R5')).toBe('CanonEOS60D');
    expect(matchScrappyCameraIcon('Nikon D850')).toBe('NikonD100');
    expect(matchScrappyCameraIcon('Fujifilm X-T5')).toBeNull();
    expect(scrappyCameraIconFileName('Fujifilm X-T5')).toBe('generic');
  });

  it('returns null for empty input', () => {
    expect(scrappyCameraIconFileName('')).toBeNull();
    expect(scrappyCameraIconFileName('   ')).toBeNull();
    expect(scrappyCameraIconUrl('')).toBeNull();
  });

  it('maps Canon EOS R bodies onto the shared modern Canon art', () => {
    const canonModern = 'CanonEOS60D';
    expect(matchScrappyCameraIcon('Canon EOS R1')).toBe(canonModern);
    expect(matchScrappyCameraIcon('Canon EOS R8')).toBe(canonModern);
    expect(matchScrappyCameraIcon('Canon EOS R50')).toBe(canonModern);
    expect(matchScrappyCameraIcon('Canon EOS R100')).toBe(canonModern);
    expect(matchScrappyCameraIcon('Canon EOS R3')).toBe('CanonEOSMarkII');
  });

  it('maps other common bodies sensibly', () => {
    expect(matchScrappyCameraIcon('Nikon Z8')).toBe('NikonD100');
    expect(matchScrappyCameraIcon('iPhone 16 Pro')).toBe('iPhoneX');
    expect(matchScrappyCameraIcon('ILCE-7M4')).toBe('SonyA7');
  });

  it('builds local retina URLs', () => {
    expect(scrappyCameraIconUrl('Canon EOS 60D')).toBe(
      '/gear/scrappy-camera-icons/CanonEOS60D@2x.png',
    );
    expect(scrappyCameraIconUrl('Fujifilm X-T5')).toBe(
      '/gear/scrappy-camera-icons/generic@2x.png',
    );
  });
});
