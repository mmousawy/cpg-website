import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/utils/supabase/server';
import type { AlbumWithPhotos } from '@/types/albums';
import type { Tables } from '@/database.types';

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
      view_count,
      profile:profiles!albums_user_id_fkey(full_name, nickname, avatar_url),
      photos:album_photos_active!inner(
        id,
        photo_url
      ),
      event:events!albums_event_id_fkey(cover_image)
    `)
    .eq('is_public', true)
    .is('deleted_at', null)
    .order(orderColumn, { ascending: false })
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
  type AlbumRow = Pick<Tables<'albums'>, 'id' | 'title' | 'description' | 'slug' | 'cover_image_url' | 'is_public' | 'created_at' | 'likes_count' | 'view_count'>;
  type ProfileRow = Pick<Tables<'profiles'>, 'full_name' | 'nickname' | 'avatar_url'>;
  type AlbumPhotoActive = Pick<Tables<'album_photos_active'>, 'id' | 'photo_url'>;
  type AlbumQueryResult = AlbumRow & {
    profile: ProfileRow | null;
    photos: Array<AlbumPhotoActive> | null;
    event: { cover_image: string | null } | null;
  };

  const albumsWithPhotos = (albums || [])
    .filter((album: AlbumQueryResult): album is AlbumQueryResult & { photos: Array<AlbumPhotoActive> } => {
      return !!album.photos && album.photos.length > 0;
    })
    .map((album) => ({
      ...album,
      event_cover_image: album.event?.cover_image || null,
    }));

  // Check if there are more by seeing if we got more than requested
  const hasMore = albumsWithPhotos.length > limit;
  const albumsToReturn = hasMore ? albumsWithPhotos.slice(0, limit) : albumsWithPhotos;

  return NextResponse.json({
    albums: albumsToReturn as unknown as AlbumWithPhotos[],
    hasMore,
  });
}
