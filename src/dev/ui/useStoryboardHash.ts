'use client';

import { useSyncExternalStore } from 'react';

import { getStoryboardHashFromLocation, subscribeStoryboardHash } from './storyboardHash';

export function useStoryboardHash(): string {
  return useSyncExternalStore(
    subscribeStoryboardHash,
    getStoryboardHashFromLocation,
    () => '',
  );
}
