import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { expireTags } from '@/lib/cache/expireTag';
import { fetchUserGearProfileForUser } from '@/lib/data/gear';
import { normalizeGearProfileServer } from '@/lib/gear/normalizeGearProfileServer';
import { persistUserGearProfileServer } from '@/lib/gear/persistUserGearProfileServer';
import { parseUserGearProfileBody } from '@/lib/gear/validateUserGearProfile';
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

  const profile = await normalizeGearProfileServer(supabase, parsed.profile);

  const { error: saveError } = await persistUserGearProfileServer(supabase, profile);

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
