'use server';

import { revalidateAlbumLikes, revalidatePhotoLikes } from '@/app/actions/revalidate';
import { createClient } from '@/utils/supabase/server';

/**
 * Toggle like/unlike for a photo or album
 * Returns the new liked state and total count
 */
export async function toggleLike(
  entityType: 'photo' | 'album',
  entityId: string,
): Promise<{ liked: boolean; count: number; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { liked: false, count: 0, error: 'Not authenticated' };
  }

  // Get owner nickname for cache invalidation
  let ownerNickname: string | null = null;

  if (entityType === 'photo') {
    // Check if already liked (use maybeSingle to avoid error when no like exists)
    const { data: existingLike, error: checkError } = await supabase
      .from('photo_likes')
      .select('photo_id, user_id')
      .eq('photo_id', entityId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('Photo like check error:', checkError);
      return { liked: false, count: 0, error: `Check error: ${checkError.message}` };
    }

    // Get owner nickname
    // Photos don't have direct FK to profiles, so query separately
    const { data: photo } = await supabase
      .from('photos')
      .select('user_id')
      .eq('id', entityId)
      .maybeSingle();

    if (photo?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', photo.user_id)
        .maybeSingle();

      if (profile?.nickname) {
        ownerNickname = profile.nickname;
      }
    }

    if (existingLike !== null && existingLike !== undefined) {
      // Unlike: delete the like
      const { data: deletedData, error: deleteError } = await supabase
        .from('photo_likes')
        .delete()
        .eq('photo_id', entityId)
        .eq('user_id', user.id)
        .select();

      if (deleteError) {
        console.error('Photo like delete error:', deleteError);
        return { liked: false, count: 0, error: `Delete error: ${deleteError.message} (code: ${deleteError.code})` };
      }

      if (!deletedData || deletedData.length === 0) {
        console.error('Photo like delete: No rows deleted - RLS policy may be blocking');
        return { liked: false, count: 0, error: 'Delete succeeded but no rows were deleted. Check RLS policies.' };
      }

    } else {
      // Like: insert the like
      const { data: insertedData, error: insertError } = await supabase
        .from('photo_likes')
        .insert({
          photo_id: entityId,
          user_id: user.id,
        })
        .select();

      if (insertError) {
        console.error('Photo like insert error:', insertError);
        return { liked: false, count: 0, error: `Insert error: ${insertError.message} (code: ${insertError.code})` };
      }

      if (!insertedData || insertedData.length === 0) {
        return { liked: false, count: 0, error: 'Insert succeeded but no data returned' };
      }
    }

    // Get updated count
    const { count } = await supabase
      .from('photo_likes')
      .select('*', { count: 'exact', head: true })
      .eq('photo_id', entityId);

    // Revalidate cache
    if (ownerNickname) {
      await revalidatePhotoLikes(ownerNickname);
    }

    return {
      liked: !existingLike,
      count: count ?? 0,
    };
  } else {
    // Album like
    // Check if already liked (use maybeSingle to avoid error when no like exists)
    const { data: existingLike, error: checkError } = await supabase
      .from('album_likes')
      .select('album_id, user_id')
      .eq('album_id', entityId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('Album like check error:', checkError);
      return { liked: false, count: 0, error: `Check error: ${checkError.message}` };
    }

    // Get owner nickname
    // Use explicit relationship name to avoid ambiguity with album_likes
    const { data: album } = await supabase
      .from('albums')
      .select('user_id, profile:profiles!albums_user_id_fkey!inner(nickname)')
      .eq('id', entityId)
      .maybeSingle();

    if (album) {
      const profile = album.profile as any;
      ownerNickname = profile?.nickname || null;
    }

    if (existingLike !== null && existingLike !== undefined) {
      // Unlike: delete the like
      const { data: deletedData, error: deleteError } = await supabase
        .from('album_likes')
        .delete()
        .eq('album_id', entityId)
        .eq('user_id', user.id)
        .select();

      if (deleteError) {
        console.error('Album like delete error:', deleteError);
        return { liked: false, count: 0, error: `Delete error: ${deleteError.message} (code: ${deleteError.code})` };
      }

      if (!deletedData || deletedData.length === 0) {
        console.error('Album like delete: No rows deleted - RLS policy may be blocking');
        return { liked: false, count: 0, error: 'Delete succeeded but no rows were deleted. Check RLS policies.' };
      }
    } else {
      // Like: insert the like
      const { data: insertedData, error: insertError } = await supabase
        .from('album_likes')
        .insert({
          album_id: entityId,
          user_id: user.id,
        })
        .select();

      if (insertError) {
        console.error('Album like insert error:', insertError);
        return { liked: false, count: 0, error: `Insert error: ${insertError.message} (code: ${insertError.code})` };
      }

      if (!insertedData || insertedData.length === 0) {
        return { liked: false, count: 0, error: 'Insert succeeded but no data returned' };
      }
    }

    // Get updated count
    const { count } = await supabase
      .from('album_likes')
      .select('*', { count: 'exact', head: true })
      .eq('album_id', entityId);

    // Revalidate cache
    if (ownerNickname) {
      await revalidateAlbumLikes(ownerNickname);
    }

    return {
      liked: !existingLike,
      count: count ?? 0,
    };
  }
}
