import { describe, expect, it } from 'vitest';

import { learnSlideNavLabel } from './slideLabel';

describe('learnSlideNavLabel', () => {
  it('uses title slide title', () => {
    expect(
      learnSlideNavLabel({ kind: 'title', title: 'Exposure' }, 0),
    ).toBe('Exposure');
  });

  it('falls back when heading is missing', () => {
    expect(
      learnSlideNavLabel({ kind: 'prose', paragraphs: ['x'] }, 2),
    ).toBe('Slide 3');
  });
});
