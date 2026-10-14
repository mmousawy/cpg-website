import { z } from 'zod';

import {
  GEAR_CATEGORIES,
  MAX_DAILY_DRIVER_FIELD_LENGTH,
  MAX_FORMATS_OTHER_LENGTH,
  SHOOTING_FORMATS,
} from '@/lib/gear/types';

const uuidSchema = z.string().uuid();

export const userGearItemSchema = z.object({
  id: uuidSchema,
  catalogId: uuidSchema.nullable(),
  name: z.string().trim().min(1).max(500),
  category: z.enum(GEAR_CATEGORIES),
  note: z.string().max(2000),
  addedAt: z.number().int().nonnegative(),
});

export const userGearProfileSchema = z
  .object({
    formats: z.array(z.enum(SHOOTING_FORMATS)).max(SHOOTING_FORMATS.length),
    formatsOther: z.string().max(MAX_FORMATS_OTHER_LENGTH),
    dailyDriverBody: z.string().max(MAX_DAILY_DRIVER_FIELD_LENGTH),
    dailyDriverBodyCatalogId: uuidSchema.nullable(),
    dailyDriverLens: z.string().max(MAX_DAILY_DRIVER_FIELD_LENGTH),
    dailyDriverLensCatalogId: uuidSchema.nullable(),
    items: z.array(userGearItemSchema).max(500),
  })
  .transform((profile) => ({
    ...profile,
    formatsOther: profile.formats.includes('other') ? profile.formatsOther.trim() : '',
    dailyDriverBody: profile.dailyDriverBody.trim(),
    dailyDriverLens: profile.dailyDriverLens.trim(),
  }));

export type UserGearProfileFormValues = z.input<typeof userGearProfileSchema>;
export type UserGearProfileParsed = z.output<typeof userGearProfileSchema>;

export const userGearItemFormSchema = z.object({
  category: z.enum(GEAR_CATEGORIES),
  name: z.string().trim().min(1, 'Name is required').max(500),
  catalogId: uuidSchema.nullable(),
  note: z.string().max(2000),
});

export type UserGearItemFormValues = z.infer<typeof userGearItemFormSchema>;
