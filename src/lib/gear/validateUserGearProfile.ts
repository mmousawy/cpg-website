import type { UserGearProfile } from '@/lib/gear/types';
import { userGearProfileSchema } from '@/lib/gear/gearProfileSchema';

function legacyBodyFromPayload(data: Record<string, unknown>): Record<string, unknown> {
  if (
    !data.dailyDriverBody
    && typeof data.goTo === 'string'
    && data.goTo.trim()
  ) {
    return {
      ...data,
      dailyDriverBody: data.goTo,
      dailyDriverBodyCatalogId: data.goToCatalogId ?? data.dailyDriverBodyCatalogId,
    };
  }
  return data;
}

export function parseUserGearProfileBody(body: unknown):
  | { ok: true; profile: UserGearProfile }
  | { ok: false; message: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Invalid JSON body' };
  }

  const normalized = legacyBodyFromPayload(body as Record<string, unknown>);
  const parsed = userGearProfileSchema.safeParse(normalized);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid gear profile';
    return { ok: false, message };
  }

  return { ok: true, profile: parsed.data };
}
