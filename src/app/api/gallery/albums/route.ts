import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/utils/supabase/server';
import type { AlbumWithPhotos } from '@/types/albums';

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

  // Fetch one extra to check if there are more
  const fetchLimit = limit + 1;
  const { data: albums, error } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      created_at,
      likes_count,
      profile:profiles!albums_user_id_fkey(full_name, nickname, avatar_url),
      photos:album_photos_active!inner(
        id,
        photo_url
      )
    `)
    .eq('is_public', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + fetchLimit - 1);

  if (error) {
    console.error('Error fetching albums:', error);
    return NextResponse.json(
      { error: 'Failed to fetch albums' },
      { status: 500 },
    );
  }

  if (!albums || albums.length === 0) {
    return NextResponse.json({
      albums: [],
      hasMore: false,
    });
  }

  // Filter out albums with no photos
  const albumsWithPhotos = ((albums || []) as any[])
    .filter((album) => album.photos && album.photos.length > 0);

  // Check if there are more by seeing if we got more than requested
  const hasMore = albumsWithPhotos.length > limit;
  const albumsToReturn = hasMore ? albumsWithPhotos.slice(0, limit) : albumsWithPhotos;

  return NextResponse.json({
    albums: albumsToReturn as unknown as AlbumWithPhotos[],
    hasMore,
  });
}
