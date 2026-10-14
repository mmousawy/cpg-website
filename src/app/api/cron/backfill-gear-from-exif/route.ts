import { NextRequest, NextResponse } from 'next/server';

import { ingestGearFromExifData } from '@/lib/gear/ingestFromExif';
import { createAdminClient } from '@/utils/supabase/admin';
import { safeEqualSecret } from '@/utils/security';

const PAGE_SIZE = 200;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!safeEqualSecret(token ?? undefined, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  let offset = 0;
  let processed = 0;
  let ingested = 0;

  for (;;) {
    const { data: rows, error } = await supabase
      .from('photos')
      .select('exif_data')
      .not('exif_data', 'is', null)
      .is('deleted_at', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!rows?.length) {
      break;
    }

    for (const row of rows) {
      const result = await ingestGearFromExifData(
        supabase,
        row.exif_data as Record<string, unknown> | null,
      );
      ingested += result.ingested;
      processed += 1;
    }

    if (rows.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  return NextResponse.json({ processed, ingested });
}
