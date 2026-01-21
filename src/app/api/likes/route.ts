import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createNotification } from '@/lib/notifications/create';
import { revalidateAlbumLikes, revalidatePhotoLikes } from '@/app/actions/revalidate';

type LikeRequest = {
  entityType: 'photo' | 'album';
  entityId: string;
  liked: boolean;
};

/**
 * Sync a single like for the current user.
 * Used by sendBeacon on page unload or visibility change.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: LikeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { entityType, entityId, liked } = body;

  if ((entityType !== 'photo' && entityType !== 'album') ||
      typeof entityId !== 'string' ||
      typeof liked !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  let ownerNickname: string | null = null;

  // Get actor profile for notifications
  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('full_name, nickname, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  try {
    if (entityType === 'photo') {
      // Check current state
      const { data: existingLike } = await supabase
        .from('photo_likes')
        .select('photo_id')
        .eq('photo_id', entityId)
        .eq('user_id', user.id)
        .maybeSingle();

      const isCurrentlyLiked = !!existingLike;

      // Only act if state needs to change
      if (liked && !isCurrentlyLiked) {
        // Insert like
        const { error: insertError } = await supabase
          .from('photo_likes')
          .insert({ photo_id: entityId, user_id: user.id });

        if (insertError) {
          return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
        }

        // Create notification for photo owner
        const { data: photo } = await supabase
          .from('photos')
          .select('user_id, title, short_id, url')
          .eq('id', entityId)
          .maybeSingle();

        if (photo?.user_id && photo.user_id !== user.id) {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', photo.user_id)
            .maybeSingle();

          if (ownerProfile?.nickname) {
            ownerNickname = ownerProfile.nickname;

            // Find album for link
            const { data: albumPhoto } = await supabase
              .from('album_photos')
              .select('albums!inner(slug)')
              .eq('photo_id', entityId)
              .limit(1)
              .maybeSingle();

            type AlbumPhotoWithAlbum = { albums: { slug: string } | null };
            const typedAlbumPhoto = albumPhoto as AlbumPhotoWithAlbum | null;

            const link = typedAlbumPhoto?.albums
              ? `/@${ownerProfile.nickname}/album/${typedAlbumPhoto.albums.slug}/photo/${photo.short_id}`
              : `/@${ownerProfile.nickname}/photo/${photo.short_id}`;

            await createNotification({
              userId: photo.user_id,
              actorId: user.id,
              type: 'like_photo',
              entityType: 'photo',
              entityId,
              data: {
                title: photo.title || 'Untitled photo',
                thumbnail: photo.url,
                link,
                actorName: actorProfile?.full_name || null,
                actorNickname: actorProfile?.nickname || null,
                actorAvatar: actorProfile?.avatar_url || null,
              },
            });
          }
        }
      } else if (!liked && isCurrentlyLiked) {
        // Delete like
        const { error: deleteError } = await supabase
          .from('photo_likes')
          .delete()
          .eq('photo_id', entityId)
          .eq('user_id', user.id);

        if (deleteError) {
          return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
        }

        // Get owner for cache invalidation
        const { data: photo } = await supabase
          .from('photos')
          .select('user_id')
          .eq('id', entityId)
          .maybeSingle();

        if (photo?.user_id) {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', photo.user_id)
            .maybeSingle();

          ownerNickname = ownerProfile?.nickname || null;
        }
      }
      // If liked === isCurrentlyLiked, no action needed (already in sync)

      if (ownerNickname) {
        await revalidatePhotoLikes(ownerNickname);
      }
    } else {
      // Album like
      const { data: existingLike } = await supabase
        .from('album_likes')
        .select('album_id')
        .eq('album_id', entityId)
        .eq('user_id', user.id)
        .maybeSingle();

      const isCurrentlyLiked = !!existingLike;

      if (liked && !isCurrentlyLiked) {
        // Insert like
        const { error: insertError } = await supabase
          .from('album_likes')
          .insert({ album_id: entityId, user_id: user.id });

        if (insertError) {
          return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
        }

        // Create notification for album owner
        const { data: album } = await supabase
          .from('albums')
          .select('user_id, title, slug, cover_image_url')
          .eq('id', entityId)
          .maybeSingle();

        if (album?.user_id && album.user_id !== user.id) {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', album.user_id)
            .maybeSingle();

          if (ownerProfile?.nickname) {
            ownerNickname = ownerProfile.nickname;

            await createNotification({
              userId: album.user_id,
              actorId: user.id,
              type: 'like_album',
              entityType: 'album',
              entityId,
              data: {
                title: album.title,
                thumbnail: album.cover_image_url,
                link: `/@${ownerProfile.nickname}/album/${album.slug}`,
                actorName: actorProfile?.full_name || null,
                actorNickname: actorProfile?.nickname || null,
                actorAvatar: actorProfile?.avatar_url || null,
              },
            });
          }
        }
      } else if (!liked && isCurrentlyLiked) {
        // Delete like
        const { error: deleteError } = await supabase
          .from('album_likes')
          .delete()
          .eq('album_id', entityId)
          .eq('user_id', user.id);

        if (deleteError) {
          return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
        }

        // Get owner for cache invalidation
        const { data: album } = await supabase
          .from('albums')
          .select('user_id')
          .eq('id', entityId)
          .maybeSingle();

        if (album?.user_id) {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', album.user_id)
            .maybeSingle();

          ownerNickname = ownerProfile?.nickname || null;
        }
      }

      if (ownerNickname) {
        await revalidateAlbumLikes(ownerNickname);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
