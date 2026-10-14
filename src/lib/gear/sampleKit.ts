'use client';

import { useSyncExternalStore } from 'react';

import type { UserGearItem } from '@/lib/gear/types';

function readSampleKitEnabled(): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  return new URLSearchParams(window.location.search).get('sampleKit') === '1';
}

/** Dev-only UI, or `/account/gear?sampleKit=1` for manual QA. */
export function useShowGearSampleKit(): boolean {
  return useSyncExternalStore(
    () => () => {},
    readSampleKitEnabled,
    () => process.env.NODE_ENV === 'development',
  );
}

const sampleAddedAt = Date.now();

export const SAMPLE_GEAR_ITEMS: UserGearItem[] = [
  {
    id: 'sample-body',
    catalogId: null,
    name: 'Fujifilm X-T5',
    category: 'camera_body',
    note: '',
    addedAt: sampleAddedAt,
  },
  {
    id: 'sample-lens',
    catalogId: null,
    name: 'XF 35mm f/1.4 R',
    category: 'lens',
    note: 'Everyday walk-around',
    addedAt: sampleAddedAt - 1000,
  },
  {
    id: 'sample-film',
    catalogId: null,
    name: 'Kodak Portra 400',
    category: 'film',
    note: '',
    addedAt: sampleAddedAt - 2000,
  },
  {
    id: 'sample-phone',
    catalogId: null,
    name: 'iPhone 16 Pro',
    category: 'phone',
    note: '',
    addedAt: sampleAddedAt - 3000,
  },
  {
    id: 'sample-lighting',
    catalogId: null,
    name: 'Godox TT350',
    category: 'lighting',
    note: '',
    addedAt: sampleAddedAt - 4000,
  },
  {
    id: 'sample-support',
    catalogId: null,
    name: 'Peak Design Travel Tripod',
    category: 'support',
    note: '',
    addedAt: sampleAddedAt - 5000,
  },
  {
    id: 'sample-accessories',
    catalogId: null,
    name: 'Peak Design Slide',
    category: 'accessories',
    note: '',
    addedAt: sampleAddedAt - 6000,
  },
  {
    id: 'sample-other',
    catalogId: null,
    name: 'Sekonic L-308X',
    category: 'other',
    note: '',
    addedAt: sampleAddedAt - 7000,
  },
];
