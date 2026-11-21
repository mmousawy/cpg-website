import type { LearnInteractiveId } from './interactives/registry';

export type LearnTitleSlide = {
  kind: 'title';
  title: string;
  subtitle?: string;
};

export type LearnProseSlide = {
  kind: 'prose';
  heading?: string;
  paragraphs: string[];
};

export type LearnBulletsSlide = {
  kind: 'bullets';
  heading?: string;
  items: string[];
};

export type LearnInteractiveSlide = {
  kind: 'interactive';
  heading?: string;
  interactiveId: LearnInteractiveId;
};

export type LearnSlide =
  | LearnTitleSlide
  | LearnProseSlide
  | LearnBulletsSlide
  | LearnInteractiveSlide;

export type LearnLesson = {
  slug: string;
  title: string;
  summary: string;
  slides: LearnSlide[];
};
