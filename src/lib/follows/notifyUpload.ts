import { scheduleNotification } from '@/lib/notifications/schedule';
import { createAdminClient } from '@/utils/supabase/admin';

type PublicPhoto = {
  id: string;
  url: string | null;
};

/**
 * Notify followers when a photographer publishes public photos.
 * Schedules coalesced followed_upload notifications with a 30s delay per follower.
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
    await scheduleNotification({
      userId: followerId,
      actorId: photographerId,
      type: 'followed_upload',
      entityType: 'profile',
      entityId: photographerId,
      coalesceIncrement: { field: 'photoCount', by: photoCount },
      data: actorData,
    });
    notifiedCount += 1;
  }

  return { notifiedCount };
}
