'use client';

import {
  EMPTY_GEAR_PROFILE,
  GEAR_STORAGE_KEY,
  normalizeUserGearProfile,
  type GearStore,
  type UserGearProfile,
} from '@/lib/gear/types';

function readStore(): GearStore {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(GEAR_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as GearStore;
  } catch {
    return {};
  }
}

function writeStore(store: GearStore) {
  localStorage.setItem(GEAR_STORAGE_KEY, JSON.stringify(store));
}

export function getGearProfile(nickname: string): UserGearProfile {
  const store = readStore();
  return normalizeUserGearProfile(store[nickname] ?? EMPTY_GEAR_PROFILE);
}

export function saveGearProfile(nickname: string, profile: UserGearProfile) {
  const store = readStore();
  store[nickname] = profile;
  writeStore(store);
}

export function clearGearProfileLocal(nickname: string) {
  const store = readStore();
  if (!(nickname in store)) {
    return;
  }
  delete store[nickname];
  writeStore(store);
}
