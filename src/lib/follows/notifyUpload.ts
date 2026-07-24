import type { Json } from '@/database.types';
import { createNotification } from '@/lib/notifications/create';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidateTag } from 'next/cache';

type PublicPhoto = {
  id: string;
  url: string | null;
};

const COALESCE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Notify followers when a photographer publishes public photos.
 * Coalesces multiple uploads within 24h into one in-app notification per follower.
 */
export async function notifyFollowersOfPublicPhotos(
  photographerId: string,
  photos: PublicPhoto[],
): Promise<{ notifiedCount: number }> {
  if (photos.length === 0) {
    return { notifiedCount: 0 };
  }

  const adminSupabase = createAdminClient();

  const { data: photographerProfile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('id, nickname, full_name, avatar_url')
    .eq('id', photographerId)
    .maybeSingle();

  if (profileError || !photographerProfile?.nickname) {
    console.error('Failed to load photographer profile for follow notifications:', profileError);
    return { notifiedCount: 0 };
  }

  const { data: followers, error: followersError } = await adminSupabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', photographerId);

  if (followersError) {
    console.error('Failed to load followers:', followersError);
    return { notifiedCount: 0 };
  }

  if (!followers?.length) {
    return { notifiedCount: 0 };
  }

  const photoCount = photos.length;
  const thumbnail = photos[photos.length - 1]?.url ?? null;
  const link = `/@${photographerProfile.nickname}`;
  const coalesceSince = new Date(Date.now() - COALESCE_WINDOW_MS).toISOString();

  const actorData = {
    actorName: photographerProfile.full_name,
    actorNickname: photographerProfile.nickname,
    actorAvatar: photographerProfile.avatar_url,
    title: photographerProfile.full_name || `@${photographerProfile.nickname}`,
    thumbnail,
    link,
    photoCount,
  };

  let notifiedCount = 0;

  for (const { follower_id: followerId } of followers) {
    const { data: existingNotification, error: existingError } = await adminSupabase
      .from('notifications')
      .select('id, data')
      .eq('user_id', followerId)
      .eq('actor_id', photographerId)
      .eq('type', 'followed_upload')
      .eq('entity_type', 'profile')
      .eq('entity_id', photographerId)
      .is('seen_at', null)
      .is('dismissed_at', null)
      .gte('created_at', coalesceSince)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error('Failed to check existing followed_upload notification:', existingError);
      continue;
    }

    if (existingNotification) {
      const existingData = (existingNotification.data || {}) as Record<string, unknown>;
      const previousCount = typeof existingData.photoCount === 'number' ? existingData.photoCount : 0;

      const { error: updateError } = await adminSupabase
        .from('notifications')
        .update({
          data: {
            ...existingData,
            ...actorData,
            photoCount: previousCount + photoCount,
            thumbnail,
            link,
          } as Json,
        })
        .eq('id', existingNotification.id);

      if (updateError) {
        console.error('Failed to update followed_upload notification:', updateError);
        continue;
      }

      revalidateTag(`notifications-${followerId}`, 'max');
      notifiedCount += 1;
      continue;
    }

    const result = await createNotification({
      userId: followerId,
      actorId: photographerId,
      type: 'followed_upload',
      entityType: 'profile',
      entityId: photographerId,
      data: actorData,
    });

    if (result.success) {
      notifiedCount += 1;
    }
  }

  return { notifiedCount };
}
