import { NextRequest, NextResponse } from 'next/server';

import { getIncludeTestContentFromRequest } from '@/lib/auth/includeTestContent';
import { getUserGearByNickname, isGearProfileEmpty } from '@/lib/data/gear';
import { EMPTY_GEAR_PROFILE } from '@/lib/gear/types';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ nickname: string }> },
) {
  const { nickname: rawNickname } = await context.params;
  const nickname = decodeURIComponent(rawNickname || '').trim().toLowerCase();

  if (!nickname) {
    return NextResponse.json({ message: 'Nickname required' }, { status: 400 });
  }

  const includeTestContent = getIncludeTestContentFromRequest(_request);
  const profile = await getUserGearByNickname(nickname, includeTestContent);

  if (profile === null) {
    return NextResponse.json({ message: 'Profile not found' }, { status: 404 });
  }

  const body = isGearProfileEmpty(profile) ? { ...EMPTY_GEAR_PROFILE } : profile;

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
