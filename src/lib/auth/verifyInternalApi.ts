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

export function isTestApiEnvironmentAllowed(): boolean {
  const isDev = process.env.NODE_ENV !== 'production';
  const isCI = !!process.env.CI;
  return isDev || isCI;
}
