import { describe, expect, it } from 'vitest';

import { getLearnLessonSlugs } from '@/content/learn';

import {
  clampSlideIndex,
  nextSlideIndex,
  parseSlideHash,
  previousSlideIndex,
  slideHash,
} from './navigation';

describe('learn navigation', () => {
  it('clamps slide index', () => {
    expect(clampSlideIndex(-1, 5)).toBe(0);
    expect(clampSlideIndex(3, 5)).toBe(3);
    expect(clampSlideIndex(99, 5)).toBe(4);
    expect(clampSlideIndex(0, 0)).toBe(0);
  });

  it('steps next and previous within bounds', () => {
    expect(nextSlideIndex(0, 3)).toBe(1);
    expect(nextSlideIndex(2, 3)).toBe(2);
    expect(previousSlideIndex(2, 3)).toBe(1);
    expect(previousSlideIndex(0, 3)).toBe(0);
  });

  it('parses slide hashes', () => {
    expect(parseSlideHash('#slide-2')).toBe(2);
    expect(parseSlideHash('slide-4')).toBe(4);
    expect(parseSlideHash('#intro')).toBeNull();
    expect(slideHash(7)).toBe('#slide-7');
  });
});

describe('learn lessons', () => {
  it('uses unique slugs', () => {
    const slugs = getLearnLessonSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.length).toBeGreaterThan(0);
  });
});
