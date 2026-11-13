import { NextRequest, NextResponse } from 'next/server';

import { nicknameSchema } from '@/utils/nickname';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('nicknames') || '';
  const nicknames = [...new Set(
    raw.split(',')
      .map((nickname) => nickname.trim().toLowerCase())
      .filter((nickname) => nicknameSchema.safeParse(nickname).success),
  )].slice(0, 50);

  if (nicknames.length === 0) {
    return NextResponse.json({ profiles: [] });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, full_name, avatar_url, allow_member_tags')
    .in('nickname', nicknames)
    .is('suspended_at', null);

  if (error) {
    console.error('Mention directory failed:', error);
    return NextResponse.json({ error: 'Lookup failed', profiles: [] }, { status: 500 });
  }

  return NextResponse.json({
    profiles: (data ?? []).flatMap((profile) => (
      profile.nickname
        ? [{
          id: profile.id,
          nickname: profile.nickname,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          allow_member_tags: profile.allow_member_tags,
        }]
        : []
    )),
  });
}
