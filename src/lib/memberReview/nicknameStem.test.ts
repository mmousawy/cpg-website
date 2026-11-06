import { describe, expect, it } from 'vitest';

import { nicknameStem, nicknameStemsMatch } from '@/lib/memberReview/nicknameStem';

describe('nicknameStem', () => {
  it('lowercases and strips trailing digits', () => {
    expect(nicknameStem('PhotoPro99')).toBe('photopro');
    expect(nicknameStem('  ANA123  ')).toBe('ana');
  });
});

describe('nicknameStemsMatch', () => {
  it('matches identical stems of length at least 4', () => {
    expect(nicknameStemsMatch('streetpix', 'streetpix2')).toBe(true);
  });

  it('matches prefix overlap when both stems are at least 4 chars', () => {
    expect(nicknameStemsMatch('photoguy', 'photo')).toBe(true);
  });

  it('does not match short stems unless equal and length >= 4', () => {
    expect(nicknameStemsMatch('ab', 'ab1')).toBe(false);
    expect(nicknameStemsMatch('abcd', 'abcd9')).toBe(true);
  });
});
