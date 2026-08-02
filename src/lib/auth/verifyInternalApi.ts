import { NextRequest, NextResponse } from 'next/server';

import { safeEqualSecret } from '@/utils/security';

/** Gate E2E / internal test APIs. Requires INTERNAL_API_SECRET (falls back to CRON_SECRET). */
export function verifyInternalApiRequest(request: NextRequest): NextResponse | null {
  const secret = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: 'Internal API secret not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!safeEqualSecret(token ?? undefined, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

/**
 * Allow E2E test APIs in local/dev, CI servers, and Vercel preview deployments.
 * Production (`VERCEL_ENV=production`) stays blocked.
 *
 * Note: `process.env.CI` is set on the GitHub Actions runner, not on the Vercel
 * preview that serves `/api/test/*`. Preview E2E therefore needs `VERCEL_ENV`.
 */
export function isTestApiEnvironmentAllowed(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  if (process.env.CI) return true;
  if (process.env.VERCEL_ENV === 'preview') return true;
  return false;
}
