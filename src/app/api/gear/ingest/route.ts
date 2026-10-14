import { NextRequest, NextResponse } from 'next/server';

import { ingestGearFromPhotoId } from '@/lib/gear/ingestFromExif';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { safeEqualSecret } from '@/utils/security';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const photoId = body?.photoId;
  const serviceRole = body?.serviceRole === true;

  if (!photoId || typeof photoId !== 'string') {
    return NextResponse.json({ error: 'Missing photoId' }, { status: 400 });
  }

  if (serviceRole) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!cronSecret || !safeEqualSecret(token ?? undefined, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const admin = createAdminClient();
    const result = await ingestGearFromPhotoId(admin, photoId);
    return NextResponse.json(result);
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: photo } = await supabase
    .from('photos')
    .select('id')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  const admin = createAdminClient();
  const result = await ingestGearFromPhotoId(admin, photoId);
  return NextResponse.json(result);
}
