import { NextRequest, NextResponse } from 'next/server';

import { refreshGearCatalog } from '@/lib/gear/refreshGearCatalog';
import { createAdminClient } from '@/utils/supabase/admin';
import { safeEqualSecret } from '@/utils/security';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set');
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!safeEqualSecret(token ?? undefined, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const counts = await refreshGearCatalog(supabase);

  return NextResponse.json({ refreshed: true, ...counts });
}
