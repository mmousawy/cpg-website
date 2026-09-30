import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createSignupBypassLink } from '@/lib/auth/signupBypass';
import { isTestApiEnvironmentAllowed, verifyInternalApiRequest } from '@/lib/auth/verifyInternalApi';

const TEST_BYPASS_TTL_MS = 60 * 60 * 1000;

/** Mint a one-hour signup invite for E2E. Staging pages stay closed without `?bypass=`. */
export async function POST(request: NextRequest) {
  const authError = verifyInternalApiRequest(request);
  if (authError) return authError;

  if (!isTestApiEnvironmentAllowed()) {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 },
    );
  }

  try {
    const { token, bypassUrl, expiresAt } = await createSignupBypassLink({
      ttlMs: TEST_BYPASS_TTL_MS,
    });

    return NextResponse.json({
      success: true,
      bypassToken: token,
      bypassUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error generating test signup bypass:', error);
    return NextResponse.json(
      { error: 'Failed to generate bypass link' },
      { status: 500 },
    );
  }
}
