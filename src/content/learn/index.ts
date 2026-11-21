import type { LearnLesson } from './types';

import { exposureLesson } from './lessons/exposure';
import { whatsOnYourCameraLesson } from './lessons/whats-on-your-camera';

export const learnLessons: LearnLesson[] = [whatsOnYourCameraLesson, exposureLesson];

export function getLearnLessonBySlug(slug: string): LearnLesson | undefined {
  return learnLessons.find((lesson) => lesson.slug === slug);
}

export function getLearnLessonSlugs(): string[] {
  return learnLessons.map((lesson) => lesson.slug);
}
