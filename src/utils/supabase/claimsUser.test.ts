import { describe, expect, it, vi } from 'vitest';

import { asSupabaseUser, getUserFromClaims } from '@/utils/supabase/claimsUser';

describe('getUserFromClaims', () => {
  it('returns id and email from verified claims', async () => {
    const supabase = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: {
            claims: {
              sub: '11111111-1111-1111-1111-111111111111',
              email: 'member@example.com',
            },
          },
          error: null,
        }),
      },
    };

    await expect(getUserFromClaims(supabase as never)).resolves.toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'member@example.com',
    });
  });

  it('returns null when claims are missing or invalid', async () => {
    const supabase = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    };

    await expect(getUserFromClaims(supabase as never)).resolves.toBeNull();
  });
});

describe('asSupabaseUser', () => {
  it('casts minimal user for legacy User-typed APIs', () => {
    const user = asSupabaseUser({ id: 'abc', email: 'a@b.c' });
    expect(user.id).toBe('abc');
    expect(user.email).toBe('a@b.c');
  });
});
