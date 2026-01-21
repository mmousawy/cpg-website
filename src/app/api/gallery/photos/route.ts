import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/utils/supabase/server';
import type { StreamPhoto } from '@/lib/data/gallery';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const sortBy = searchParams.get('sort') === 'popular' ? 'popular' : 'recent';

  // Validate params
  if (offset < 0 || limit < 1 || limit > 100) {
    return NextResponse.json(
      { error: 'Invalid offset or limit' },
      { status: 400 },
    );
  }

  const supabase = createPublicClient();

  const orderColumn = sortBy === 'popular' ? 'view_count' : 'created_at';

  // Fetch one extra to check if there are more
  const fetchLimit = limit + 1;
  const { data: photos, error } = await supabase
    .from('photos')
    .select('*')
    .eq('is_public', true)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%')
    .order(orderColumn, { ascending: false })
    .range(offset, offset + fetchLimit - 1);

  if (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 },
    );
  }

  if (!photos || photos.length === 0) {
    return NextResponse.json({
      photos: [],
      hasMore: false,
    });
  }

  // Get unique user IDs
  const userIds = [...new Set(photos.map((p) => p.user_id).filter((id): id is string => id !== null))];

  // Fetch profiles for these users
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, full_name, avatar_url, suspended_at')
    .in('id', userIds);

  // Create a map for quick lookup
  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p]),
  );

  // Filter out photos from suspended users and merge with profile data
  const validPhotos = photos
    .filter((p) => {
      if (!p.user_id) return false;
      const profile = profileMap.get(p.user_id);
      return profile && !profile.suspended_at && profile.nickname;
    })
    .map((p) => {
      const profile = profileMap.get(p.user_id!);
      return {
        ...p,
        profile: profile ? {
          nickname: profile.nickname!,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        } : null,
      } as StreamPhoto;
    });

  // Check if there are more by seeing if we got more than requested
  const hasMore = validPhotos.length > limit;
  const photosToReturn = hasMore ? validPhotos.slice(0, limit) : validPhotos;

  return NextResponse.json({
    photos: photosToReturn,
    hasMore,
  });
}
