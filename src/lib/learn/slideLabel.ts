import type { LearnSlide } from '@/content/learn/types';

export function learnSlideNavLabel(slide: LearnSlide, index: number): string {
  switch (slide.kind) {
    case 'title':
      return slide.title;
    case 'prose':
    case 'bullets':
    case 'interactive':
      return slide.heading ?? `Slide ${index + 1}`;
    default: {
      const _exhaustive: never = slide;
      return _exhaustive;
    }
  }
}
