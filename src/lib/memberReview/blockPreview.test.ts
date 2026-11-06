import { describe, expect, it } from 'vitest';

import { parsePreviewFlagQuery } from '@/lib/memberReview/blockPreview';

describe('parsePreviewFlagQuery', () => {
  it('enables on true/1/on/yes', () => {
    expect(parsePreviewFlagQuery('true')).toBe('enable');
    expect(parsePreviewFlagQuery('1')).toBe('enable');
    expect(parsePreviewFlagQuery('ON')).toBe('enable');
    expect(parsePreviewFlagQuery('yes')).toBe('enable');
  });

  it('disables on false/0/off/no', () => {
    expect(parsePreviewFlagQuery('false')).toBe('disable');
    expect(parsePreviewFlagQuery('0')).toBe('disable');
    expect(parsePreviewFlagQuery('OFF')).toBe('disable');
    expect(parsePreviewFlagQuery('no')).toBe('disable');
  });

  it('ignores empty and unknown values', () => {
    expect(parsePreviewFlagQuery(null)).toBeNull();
    expect(parsePreviewFlagQuery('')).toBeNull();
    expect(parsePreviewFlagQuery('blocked')).toBeNull();
  });
});
