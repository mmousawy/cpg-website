export const GEAR_CATEGORIES = [
  'camera_body',
  'lens',
  'film',
  'phone',
  'lighting',
  'support',
  'accessories',
  'other',
] as const;

export type GearCategory = (typeof GEAR_CATEGORIES)[number];

export const GEAR_CATEGORY_LABELS: Record<GearCategory, string> = {
  camera_body: 'Camera body',
  lens: 'Lens',
  film: 'Film & instant',
  phone: 'Phone',
  lighting: 'Lighting',
  support: 'Support',
  accessories: 'Accessory',
  other: 'Other',
};

/** Section headings when inventory is grouped by type (plural where it reads naturally). */
export const GEAR_CATEGORY_GROUP_LABELS: Record<GearCategory, string> = {
  camera_body: 'Camera bodies',
  lens: 'Lenses',
  film: 'Film & instant',
  phone: 'Phones',
  lighting: 'Lighting',
  support: 'Support',
  accessories: 'Accessories',
  other: 'Other',
};

export const SHOOTING_FORMATS = [
  'digital',
  'analog',
  'phone',
  'instant',
  'drone',
  'video',
  'lofi',
  'other',
] as const;
export type ShootingFormat = (typeof SHOOTING_FORMATS)[number];

export const SHOOTING_FORMAT_LABELS: Record<ShootingFormat, string> = {
  digital: 'Digital camera',
  analog: 'Analog / film',
  phone: 'Phone',
  instant: 'Instant',
  drone: 'Drone',
  video: 'Video',
  lofi: 'Toy / lo-fi',
  other: 'Other',
};

export const MAX_FORMATS_OTHER_LENGTH = 80;

export function shootingFormatDisplayLabel(
  format: ShootingFormat,
  formatsOther: string,
): string {
  if (format === 'other') {
    const trimmed = formatsOther.trim();
    return trimmed.length > 0 ? trimmed : SHOOTING_FORMAT_LABELS.other;
  }
  return SHOOTING_FORMAT_LABELS[format];
}

export type GearCatalogSource = 'lensfun' | 'wikidata' | 'curated' | 'exif';

export type UserGearItem = {
  id: string;
  catalogId: string | null;
  name: string;
  category: GearCategory;
  note: string;
  addedAt: number;
};

export const MAX_DAILY_DRIVER_FIELD_LENGTH = 500;

export type UserGearProfile = {
  formats: ShootingFormat[];
  formatsOther: string;
  dailyDriverBody: string;
  dailyDriverBodyCatalogId: string | null;
  dailyDriverLens: string;
  dailyDriverLensCatalogId: string | null;
  items: UserGearItem[];
};

export type GearStore = Record<string, UserGearProfile>;

export const GEAR_STORAGE_KEY = 'cpg-profile-gear-v1';

export const EMPTY_GEAR_PROFILE: UserGearProfile = {
  formats: [],
  formatsOther: '',
  dailyDriverBody: '',
  dailyDriverBodyCatalogId: null,
  dailyDriverLens: '',
  dailyDriverLensCatalogId: null,
  items: [],
};

export function hasDailyDriver(profile: UserGearProfile): boolean {
  return (
    profile.dailyDriverBody.trim().length > 0
    || profile.dailyDriverLens.trim().length > 0
  );
}

export function normalizeUserGearProfile(
  input: Partial<UserGearProfile> | null | undefined,
): UserGearProfile {
  if (!input) {
    return { ...EMPTY_GEAR_PROFILE };
  }
  const legacy = input as Partial<UserGearProfile> & { goTo?: string; goToCatalogId?: string | null };
  let dailyDriverBody = typeof input.dailyDriverBody === 'string' ? input.dailyDriverBody : '';
  let dailyDriverBodyCatalogId = input.dailyDriverBodyCatalogId ?? null;
  if (!dailyDriverBody.trim() && typeof legacy.goTo === 'string' && legacy.goTo.trim()) {
    dailyDriverBody = legacy.goTo;
    dailyDriverBodyCatalogId = legacy.goToCatalogId ?? null;
  }

  return {
    formats: Array.isArray(input.formats) ? [...input.formats] : [],
    formatsOther: typeof input.formatsOther === 'string' ? input.formatsOther : '',
    dailyDriverBody,
    dailyDriverBodyCatalogId,
    dailyDriverLens: typeof input.dailyDriverLens === 'string' ? input.dailyDriverLens : '',
    dailyDriverLensCatalogId: input.dailyDriverLensCatalogId ?? null,
    items: Array.isArray(input.items) ? input.items.map((item) => ({ ...item })) : [],
  };
}

export function isGearProfileEmpty(profile: UserGearProfile): boolean {
  return (
    profile.formats.length === 0
    && !hasDailyDriver(profile)
    && profile.items.length === 0
  );
}
