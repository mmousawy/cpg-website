import { describe, expect, it } from 'vitest';

import {
  getNicknameCooldownEnd,
  isNicknameChangeOnCooldown,
  nicknameSchema,
  normalizeNicknameInput,
} from '@/utils/nickname';

describe('nicknameSchema', () => {
  it('accepts valid nicknames', () => {
    expect(nicknameSchema.safeParse('johndoe').success).toBe(true);
    expect(nicknameSchema.safeParse('john-doe-2').success).toBe(true);
  });

  it('rejects invalid nicknames', () => {
    expect(nicknameSchema.safeParse('ab').success).toBe(false);
    expect(nicknameSchema.safeParse('-john').success).toBe(false);
    expect(nicknameSchema.safeParse('john-').success).toBe(false);
    expect(nicknameSchema.safeParse('John_Doe').success).toBe(false);
  });
});

describe('normalizeNicknameInput', () => {
  it('lowercases and strips invalid characters', () => {
    expect(normalizeNicknameInput('John_Doe!')).toBe('johndoe');
  });
});

describe('nickname cooldown', () => {
  it('returns null when nickname was never changed', () => {
    expect(getNicknameCooldownEnd(null)).toBeNull();
    expect(isNicknameChangeOnCooldown(null)).toBe(false);
  });

  it('is on cooldown within 60 days of last change', () => {
    const changedAt = new Date('2026-01-01T12:00:00Z');
    const now = new Date('2026-02-01T12:00:00Z');
    expect(isNicknameChangeOnCooldown(changedAt.toISOString(), now)).toBe(true);
  });

  it('is off cooldown after 60 days', () => {
    const changedAt = new Date('2026-01-01T12:00:00Z');
    const now = new Date('2026-03-03T12:00:00Z');
    expect(isNicknameChangeOnCooldown(changedAt.toISOString(), now)).toBe(false);
  });
});
