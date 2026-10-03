import type { Profile } from '@/context/AuthContext';
import type { Json } from '@/database.types';
import {
  PHOTOS_MANAGE_TOUR_QUERY_VALUE,
  PHOTOS_TOUR_QUERY_VALUE,
} from '@/tours/photosFirstRunTour.constants';

export type TourEntry = {
  dismissed_at?: string;
  finished_at?: string;
};

export type ProfileToursState = Record<string, TourEntry>;

export const PHOTOS_UPLOAD_TOUR_ID = PHOTOS_TOUR_QUERY_VALUE;
export const PHOTOS_MANAGE_TOUR_ID = PHOTOS_MANAGE_TOUR_QUERY_VALUE;

function parseTourEntry(value: unknown): TourEntry | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const entry: TourEntry = {};
  if (typeof record.dismissed_at === 'string' && record.dismissed_at.length > 0) {
    entry.dismissed_at = record.dismissed_at;
  }
  if (typeof record.finished_at === 'string' && record.finished_at.length > 0) {
    entry.finished_at = record.finished_at;
  }
  return entry.dismissed_at || entry.finished_at ? entry : undefined;
}

export function parseProfileTours(value: Json | null | undefined): ProfileToursState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  const state: ProfileToursState = {};
  for (const [tourId, raw] of Object.entries(record)) {
    const entry = parseTourEntry(raw);
    if (entry) {
      state[tourId] = entry;
    }
  }
  return state;
}

export function isTourEnded(profile: Profile | null | undefined, tourId: string): boolean {
  const entry = parseProfileTours(profile?.tours)[tourId];
  return Boolean(entry?.dismissed_at || entry?.finished_at);
}

export function isPhotosUploadTourDismissed(profile: Profile | null | undefined): boolean {
  return isTourEnded(profile, PHOTOS_UPLOAD_TOUR_ID);
}

export function isPhotosManageTourDismissed(profile: Profile | null | undefined): boolean {
  return isTourEnded(profile, PHOTOS_MANAGE_TOUR_ID);
}

export type TourOutcome = 'dismissed' | 'finished';

export async function persistTourOutcome(
  userId: string,
  tourId: string,
  outcome: TourOutcome,
  profile: Profile | null | undefined,
  refreshProfile?: () => Promise<void>,
): Promise<void> {
  const now = new Date().toISOString();
  const tours = parseProfileTours(profile?.tours);
  const existing = tours[tourId] ?? {};
  const nextEntry: TourEntry = {
    ...existing,
    ...(outcome === 'finished' ? { finished_at: now } : { dismissed_at: now }),
  };

  const { supabase } = await import('@/utils/supabase/client');
  const { error } = await supabase
    .from('profiles')
    .update({
      tours: {
        ...tours,
        [tourId]: nextEntry,
      },
    })
    .eq('id', userId);

  if (error) {
    console.error(`Failed to persist tour outcome (${tourId}, ${outcome}):`, error);
    return;
  }

  await refreshProfile?.();
}

export async function persistPhotosUploadTourOutcome(
  userId: string,
  outcome: TourOutcome,
  profile: Profile | null | undefined,
  refreshProfile?: () => Promise<void>,
): Promise<void> {
  await persistTourOutcome(userId, PHOTOS_UPLOAD_TOUR_ID, outcome, profile, refreshProfile);
}

export async function persistPhotosManageTourOutcome(
  userId: string,
  outcome: TourOutcome,
  profile: Profile | null | undefined,
  refreshProfile?: () => Promise<void>,
): Promise<void> {
  await persistTourOutcome(userId, PHOTOS_MANAGE_TOUR_ID, outcome, profile, refreshProfile);
}
