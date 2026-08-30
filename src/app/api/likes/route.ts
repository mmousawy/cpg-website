import { NextRequest, NextResponse } from 'next/server';
import { revalidateAlbumLikes, revalidatePhotoLikes } from '@/app/actions/revalidate';
import {
  removeActorFromPendingNotification,
  scheduleNotification,
} from '@/lib/notifications/schedule';
import { createClient } from '@/utils/supabase/server';

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
  let ownerId: string | null = null;
  let photoShortId: string | null = null;
  let albumSlug: string | null = null;

  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('full_name, nickname, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  try {
    if (entityType === 'photo') {
      const { data: existingLike } = await supabase
        .from('photo_likes')
        .select('photo_id')
        .eq('photo_id', entityId)
        .eq('user_id', user.id)
        .maybeSingle();

      const isCurrentlyLiked = !!existingLike;

      if (liked && !isCurrentlyLiked) {
        const { error: insertError } = await supabase
          .from('photo_likes')
          .insert({ photo_id: entityId, user_id: user.id });

        if (insertError) {
          return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
        }

        const { data: photo } = await supabase
          .from('photos')
          .select('user_id, title, short_id, url')
          .eq('id', entityId)
          .maybeSingle();

        if (photo?.user_id && photo.user_id !== user.id) {
          ownerId = photo.user_id;
          photoShortId = photo.short_id ?? null;

          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', photo.user_id)
            .maybeSingle();

          if (ownerProfile?.nickname) {
            ownerNickname = ownerProfile.nickname;

            await scheduleNotification({
              userId: photo.user_id,
              actorId: user.id,
              type: 'like_photo',
              entityType: 'photo',
              entityId,
              validateAction: 'like_photo',
              data: {
                title: photo.title || 'Untitled photo',
                thumbnail: photo.url,
                link: `/@${ownerProfile.nickname}/photo/${photo.short_id}`,
                actorName: actorProfile?.full_name || null,
                actorNickname: actorProfile?.nickname || null,
                actorAvatar: actorProfile?.avatar_url || null,
              },
            });
          }
        }
      } else if (!liked && isCurrentlyLiked) {
        const { error: deleteError } = await supabase
          .from('photo_likes')
          .delete()
          .eq('photo_id', entityId)
          .eq('user_id', user.id);

        if (deleteError) {
          return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
        }

        const { data: photo } = await supabase
          .from('photos')
          .select('user_id, short_id')
          .eq('id', entityId)
          .maybeSingle();

        if (photo?.user_id) {
          ownerId = photo.user_id;
          photoShortId = photo.short_id ?? null;

          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', photo.user_id)
            .maybeSingle();

          ownerNickname = ownerProfile?.nickname || null;

          await removeActorFromPendingNotification({
            type: 'like_photo',
            recipientUserId: photo.user_id,
            actorId: user.id,
            entityType: 'photo',
            entityId,
          });
        }
      }

      if (!photoShortId || !ownerNickname) {
        const { data: photo } = await supabase
          .from('photos')
          .select('short_id, user_id')
          .eq('id', entityId)
          .maybeSingle();

        if (photo) {
          photoShortId = photo.short_id ?? photoShortId;
          if (!ownerNickname && photo.user_id) {
            const { data: ownerProfile } = await supabase
              .from('profiles')
              .select('nickname')
              .eq('id', photo.user_id)
              .maybeSingle();
            ownerNickname = ownerProfile?.nickname || null;
          }
        }
      }

      if (ownerNickname && photoShortId) {
        await revalidatePhotoLikes(entityId, ownerNickname, photoShortId);
      }
    } else {
      const { data: existingLike } = await supabase
        .from('album_likes')
        .select('album_id')
        .eq('album_id', entityId)
        .eq('user_id', user.id)
        .maybeSingle();

      const isCurrentlyLiked = !!existingLike;

      if (liked && !isCurrentlyLiked) {
        const { error: insertError } = await supabase
          .from('album_likes')
          .insert({ album_id: entityId, user_id: user.id });

        if (insertError) {
          return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
        }

        const { data: album } = await supabase
          .from('albums')
          .select('user_id, title, slug, cover_image_url')
          .eq('id', entityId)
          .maybeSingle();

        if (album?.user_id && album.user_id !== user.id) {
          ownerId = album.user_id;
          albumSlug = album.slug ?? null;

          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', album.user_id)
            .maybeSingle();

          if (ownerProfile?.nickname) {
            ownerNickname = ownerProfile.nickname;

            await scheduleNotification({
              userId: album.user_id,
              actorId: user.id,
              type: 'like_album',
              entityType: 'album',
              entityId,
              validateAction: 'like_album',
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
        const { error: deleteError } = await supabase
          .from('album_likes')
          .delete()
          .eq('album_id', entityId)
          .eq('user_id', user.id);

        if (deleteError) {
          return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
        }

        const { data: album } = await supabase
          .from('albums')
          .select('user_id, slug')
          .eq('id', entityId)
          .maybeSingle();

        if (album?.user_id) {
          ownerId = album.user_id;
          albumSlug = album.slug ?? null;

          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', album.user_id)
            .maybeSingle();

          ownerNickname = ownerProfile?.nickname || null;

          await removeActorFromPendingNotification({
            type: 'like_album',
            recipientUserId: album.user_id,
            actorId: user.id,
            entityType: 'album',
            entityId,
          });
        }
      }

      if (!albumSlug || !ownerNickname) {
        const { data: album } = await supabase
          .from('albums')
          .select('slug, user_id')
          .eq('id', entityId)
          .maybeSingle();

        if (album) {
          albumSlug = album.slug ?? albumSlug;
          if (!ownerNickname && album.user_id) {
            const { data: ownerProfile } = await supabase
              .from('profiles')
              .select('nickname')
              .eq('id', album.user_id)
              .maybeSingle();
            ownerNickname = ownerProfile?.nickname || null;
          }
        }
      }

      if (ownerNickname && albumSlug) {
        await revalidateAlbumLikes(entityId, ownerNickname, albumSlug);
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
