import type { NextRequest } from 'next/server';

import { getClientIp } from '@/utils/security';

export type RequestClientMeta = {
  ip: string | null;
  userAgent: string | null;
  acceptLanguage: string | null;
};

export function getRequestClientMeta(request: NextRequest): RequestClientMeta {
  return {
    ip: getClientIp({
      cfConnectingIp: request.headers.get('cf-connecting-ip'),
      xRealIp: request.headers.get('x-real-ip'),
      xForwardedFor: request.headers.get('x-forwarded-for'),
    }),
    userAgent: request.headers.get('user-agent'),
    acceptLanguage: request.headers.get('accept-language'),
  };
}

/** Skip server-side auth sessions and other non-browser signups. */
export function isRecordableClientMeta(meta: RequestClientMeta): meta is RequestClientMeta & { ip: string } {
  if (!meta.ip?.trim()) return false;
  if (meta.userAgent?.trim().toLowerCase() === 'node') return false;
  return true;
}
