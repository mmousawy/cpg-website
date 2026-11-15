'use client';

import { iconStoryFrames } from './iconStories';
import { sharedStoryFrames } from './sharedStories';
import type { UiStoryFrame } from './types';

const framesByGroup: Record<string, Record<string, UiStoryFrame[]>> = {
  shared: sharedStoryFrames,
  icons: iconStoryFrames,
};

export function getStoryFrames(groupId: string, componentName: string): UiStoryFrame[] {
  return framesByGroup[groupId]?.[componentName] ?? [];
}

export function componentHasStories(groupId: string, componentName: string): boolean {
  return getStoryFrames(groupId, componentName).length > 0;
}

export function countStoriesInRegistry(): number {
  let n = 0;
  for (const group of Object.values(framesByGroup)) {
    for (const frames of Object.values(group)) {
      n += frames.length;
    }
  }
  return n;
}
