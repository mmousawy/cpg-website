'use client';

import clsx from 'clsx';

import { learnInteractives } from '@/content/learn/interactives/registry';
import type { LearnSlide } from '@/content/learn/types';

type LearnSlideContentProps = {
  slide: LearnSlide;
  presenter?: boolean;
};

export default function LearnSlideContent({ slide, presenter = true }: LearnSlideContentProps) {
  const headingClass = presenter
    ? 'font-heading text-3xl font-semibold text-foreground sm:text-4xl md:text-5xl'
    : 'font-heading text-2xl font-semibold text-foreground';

  switch (slide.kind) {
    case 'title':
      return (
        <div
          className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center"
        >
          <h1
            className={clsx(headingClass, 'text-4xl sm:text-5xl md:text-6xl')}
          >
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p
              className="max-w-2xl text-lg text-foreground/75 sm:text-xl md:text-2xl"
            >
              {slide.subtitle}
            </p>
          )}
        </div>
      );
    case 'prose':
      return (
        <div
          className="mx-auto flex w-full max-w-3xl flex-col gap-6"
        >
          {slide.heading && (
            <h2
              className={headingClass}
            >
              {slide.heading}
            </h2>
          )}
          {slide.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="text-lg leading-relaxed text-foreground/90 sm:text-xl md:text-2xl md:leading-relaxed"
            >
              {paragraph}
            </p>
          ))}
        </div>
      );
    case 'bullets':
      return (
        <div
          className="mx-auto flex w-full max-w-3xl flex-col gap-6"
        >
          {slide.heading && (
            <h2
              className={headingClass}
            >
              {slide.heading}
            </h2>
          )}
          <ul
            className="flex flex-col gap-4 text-lg sm:text-xl md:text-2xl"
          >
            {slide.items.map((item) => (
              <li
                key={item}
                className="flex gap-3 text-foreground/90"
              >
                <span
                  className="mt-2.5 size-2 shrink-0 rounded-full bg-primary"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'interactive': {
      const Interactive = learnInteractives[slide.interactiveId];
      return (
        <div
          className="mx-auto flex min-h-0 w-full min-w-0 flex-1 flex-col items-stretch gap-6"
        >
          {slide.heading && (
            <h2
              className={headingClass}
            >{slide.heading}</h2>
          )}
          <Interactive />
        </div>
      );
    }
    default: {
      const _exhaustive: never = slide;
      return _exhaustive;
    }
  }
}
