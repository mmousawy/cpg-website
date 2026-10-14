import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { expireTags } from '@/lib/cache/expireTag';
import { fetchUserGearProfileForUser } from '@/lib/data/gear';
import { parseUserGearProfileBody } from '@/lib/gear/validateUserGearProfile';
import type { Json } from '@/database.types';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const profile = await fetchUserGearProfileForUser(supabase, user.id);
  return NextResponse.json(profile);
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseUserGearProfileBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  const { profile } = parsed;

  const { error: saveError } = await supabase.rpc('save_user_gear_profile', {
    p_formats: profile.formats,
    p_formats_other: profile.formatsOther,
    p_daily_driver_body: profile.dailyDriverBody,
    p_daily_driver_body_catalog_id: profile.dailyDriverBodyCatalogId,
    p_daily_driver_lens: profile.dailyDriverLens,
    p_daily_driver_lens_catalog_id: profile.dailyDriverLensCatalogId,
    p_items: profile.items as unknown as Json,
  });

  if (saveError) {
    console.error('save_user_gear_profile:', saveError);
    return NextResponse.json(
      { message: saveError.message || 'Failed to save gear' },
      { status: 500 },
    );
  }

  const { data: nicknameRow } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('id', user.id)
    .maybeSingle();

  if (nicknameRow?.nickname) {
    const nick = nicknameRow.nickname;
    expireTags([`profile-${nick}`, 'user-gear']);
    revalidatePath(`/@${nick}/gear`);
    revalidatePath(`/@${nick}`);
  }

  return NextResponse.json(profile);
}
