import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/utils/supabase/server';
import type { StreamPhoto } from '@/lib/data/gallery';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  // Validate params
  if (offset < 0 || limit < 1 || limit > 100) {
    return NextResponse.json(
      { error: 'Invalid offset or limit' },
      { status: 400 },
    );
  }

  const supabase = createPublicClient();

  // Get recently liked photo IDs (ordered by most recent like)
  // We need to get more to account for duplicates, then deduplicate
  // Fetch extra to check if there are more after filtering
  const fetchLimit = (offset + limit + 1) * 2; // Get more to account for duplicates and check for more
  const { data: recentLikes } = await supabase
    .from('photo_likes')
    .select('photo_id, created_at, photos!inner(id, is_public, deleted_at, storage_path)')
    .eq('photos.is_public', true)
    .is('photos.deleted_at', null)
    .not('photos.storage_path', 'like', 'events/%')
    .order('created_at', { ascending: false })
    .limit(fetchLimit);

  if (!recentLikes || recentLikes.length === 0) {
    return NextResponse.json({
      photos: [],
      hasMore: false,
    });
  }

  // Get unique photo IDs (first occurrence = most recently liked)
  const seenPhotoIds = new Set<string>();
  const uniquePhotoIds: string[] = [];
  const photoLikeTimeMap = new Map<string, string>();

  for (const like of recentLikes) {
    const photoId = like.photo_id;
    if (!seenPhotoIds.has(photoId)) {
      seenPhotoIds.add(photoId);
      uniquePhotoIds.push(photoId);
      const likeTime = like.created_at;
      if (likeTime) {
        photoLikeTimeMap.set(photoId, likeTime);
      }
    }
  }

  // Apply pagination to unique IDs
  const paginatedPhotoIds = uniquePhotoIds.slice(offset, offset + limit);

  if (paginatedPhotoIds.length === 0) {
    return NextResponse.json({
      photos: [],
      hasMore: uniquePhotoIds.length > offset + limit,
    });
  }

  // Fetch the actual photos
  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .in('id', paginatedPhotoIds)
    .eq('is_public', true)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%');

  if (!photos || photos.length === 0) {
    return NextResponse.json({
      photos: [],
      hasMore: uniquePhotoIds.length > offset + limit,
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

  // Filter out photos from suspended users, merge with profile data, and sort by most recent like
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
        _likeTime: photoLikeTimeMap.get(p.id) || p.created_at, // For sorting
      } as StreamPhoto & { _likeTime: string };
    })
    .sort((a, b) => {
      // Sort by most recent like timestamp
      const aTime = a._likeTime || a.created_at || '';
      const bTime = b._likeTime || b.created_at || '';
      return bTime.localeCompare(aTime);
    })
    .map(({ _likeTime, ...photo }) => photo as StreamPhoto); // Remove temporary sorting field

  // Check if there are more by seeing if we have more unique IDs than requested
  const requestedEndIndex = offset + limit;
  const hasMore = uniquePhotoIds.length > requestedEndIndex;
  const photosToReturn = validPhotos.slice(0, limit);

  return NextResponse.json({
    photos: photosToReturn,
    hasMore,
  });
}
