import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const nickname = searchParams.get('nickname');
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  if (!nickname) {
    return NextResponse.json(
      { error: 'Missing nickname parameter' },
      { status: 400 },
    );
  }

  if (offset < 0 || limit < 1 || limit > 100) {
    return NextResponse.json(
      { error: 'Invalid offset or limit' },
      { status: 400 },
    );
  }

  const supabase = createPublicClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nickname, full_name, avatar_url, suspended_at, deletion_scheduled_at')
    .eq('nickname', nickname)
    .is('suspended_at', null)
    .is('deletion_scheduled_at', null)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: 'Profile not found' },
      { status: 404 },
    );
  }

  const fetchLimit = limit + 1;
  const { data: photos, error } = await supabase
    .from('photos')
    .select('id, short_id, url, blurhash, width, height, title, likes_count, created_at, user_id')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + fetchLimit - 1);

  if (error) {
    console.error('Error fetching user photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 },
    );
  }

  if (!photos || photos.length === 0) {
    return NextResponse.json({ photos: [], hasMore: false });
  }

  const hasMore = photos.length > limit;
  const photosToReturn = (hasMore ? photos.slice(0, limit) : photos).map((p) => ({
    ...p,
    profile: {
      nickname: profile.nickname!,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
    },
  }));

  return NextResponse.json({ photos: photosToReturn, hasMore });
}
