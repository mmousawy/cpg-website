import type { UserGearProfile } from '@/lib/gear/types';

export function cloneGearProfile(profile: UserGearProfile): UserGearProfile {
  return {
    ...profile,
    formats: [...profile.formats],
    items: profile.items.map((item) => ({ ...item })),
  };
}

export function gearProfilesEqual(a: UserGearProfile, b: UserGearProfile): boolean {
  if (
    a.dailyDriverBody !== b.dailyDriverBody
    || a.dailyDriverBodyCatalogId !== b.dailyDriverBodyCatalogId
    || a.dailyDriverLens !== b.dailyDriverLens
    || a.dailyDriverLensCatalogId !== b.dailyDriverLensCatalogId
    || a.formatsOther !== b.formatsOther
  ) {
    return false;
  }
  if (a.formats.length !== b.formats.length) {
    return false;
  }
  const formatsA = [...a.formats].sort().join(',');
  const formatsB = [...b.formats].sort().join(',');
  if (formatsA !== formatsB) {
    return false;
  }
  if (a.items.length !== b.items.length) {
    return false;
  }
  for (let i = 0; i < a.items.length; i += 1) {
    const left = a.items[i];
    const right = b.items[i];
    if (
      left.id !== right.id
      || left.catalogId !== right.catalogId
      || left.name !== right.name
      || left.category !== right.category
      || left.note !== right.note
      || left.addedAt !== right.addedAt
    ) {
      return false;
    }
  }
  return true;
}
