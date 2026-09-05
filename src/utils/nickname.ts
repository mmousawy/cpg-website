import { z } from 'zod';

export const NICKNAME_COOLDOWN_DAYS = 60;
export const NICKNAME_REDIRECT_RETENTION_DAYS = 365;

export const nicknameSchema = z
  .string()
  .min(3, 'Nickname must be at least 3 characters')
  .max(30, 'Nickname must be at most 30 characters')
  .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed')
  .refine((val) => !val.startsWith('-') && !val.endsWith('-'), {
    message: 'Nickname cannot start or end with a hyphen',
  });

export function normalizeNicknameInput(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function getNicknameCooldownEnd(
  nicknameChangedAt: string | null | undefined,
): Date | null {
  if (!nicknameChangedAt) return null;

  const changedAt = new Date(nicknameChangedAt);
  if (Number.isNaN(changedAt.getTime())) return null;

  const cooldownEnd = new Date(changedAt);
  cooldownEnd.setDate(cooldownEnd.getDate() + NICKNAME_COOLDOWN_DAYS);
  return cooldownEnd;
}

export function isNicknameChangeOnCooldown(
  nicknameChangedAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const cooldownEnd = getNicknameCooldownEnd(nicknameChangedAt);
  return cooldownEnd !== null && now < cooldownEnd;
}

export function formatNicknameCooldownDate(date: Date, locale = 'en-US'): string {
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
