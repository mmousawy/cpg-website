'use client';

import { Analytics } from '@vercel/analytics/react';

/**
 * Vercel Web Analytics only works on Vercel-hosted deployments.
 * On Coolify/self-host, leave NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS unset or false.
 */
export default function VercelAnalytics() {
  if (process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS !== 'true') {
    return null;
  }
  return <Analytics />;
}
