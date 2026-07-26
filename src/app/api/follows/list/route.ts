import { getFollowList } from '@/lib/data/follows';
import type { FollowListType } from '@/types/follows';
import { NextRequest, NextResponse } from 'next/server';

const VALID_TYPES: FollowListType[] = ['followers', 'following'];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const profileId = searchParams.get('profileId');
  const type = searchParams.get('type') as FollowListType | null;
  const offsetParam = searchParams.get('offset');
  const limitParam = searchParams.get('limit');
  const query = searchParams.get('q') ?? undefined;

  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
  }

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'type must be followers or following' }, { status: 400 });
  }

  const offset = Math.max(parseInt(offsetParam ?? '0', 10) || 0, 0);
  const limit = Math.min(Math.max(parseInt(limitParam ?? '20', 10) || 20, 1), 50);

  try {
    const result = await getFollowList({
      profileId,
      type,
      offset,
      limit,
      query,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in follows list API:', error);
    return NextResponse.json({ error: 'Failed to load follow list' }, { status: 500 });
  }
}
