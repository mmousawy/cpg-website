import { checkIsAdmin } from '@/lib/auth/checkIsAdmin';
import { createClient } from '@/utils/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';

export type PhotoMemberTag = {
  id: string;
  profileId: string;
  nickname: string;
  fullName: string | null;
  avatarUrl: string | null;
  x: number;
  y: number;
};

type MemberTagRow = {
  id: string;
  profile_id: string;
  x: number;
  y: number;
  profiles: {
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

export function mapPhotoMemberTagRows(rows: MemberTagRow[] | null | undefined): PhotoMemberTag[] {
  return (rows ?? []).flatMap((row) => {
    const profile = row.profiles;
    if (!profile?.nickname) return [];
    return [{
      id: row.id,
      profileId: row.profile_id,
      nickname: profile.nickname,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      x: Number(row.x),
      y: Number(row.y),
    }];
  });
}

export async function fetchPhotoMemberTags(
  supabase: SupabaseClient,
  photoId: string,
): Promise<PhotoMemberTag[]> {
  const { data: rows, error } = await supabase
    .from('photo_member_tags')
    .select('id, profile_id, x, y, profiles!photo_member_tags_profile_id_fkey(nickname, full_name, avatar_url)')
    .eq('photo_id', photoId);

  if (error) {
    console.error('Failed to load photo member tags:', error);
    return [];
  }

  return mapPhotoMemberTagRows(rows as unknown as MemberTagRow[]);
}

export const getPhotoMemberTagsPageAuth = cache(async (photoUserId: string | null) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;
  let canEdit = false;
  if (user && photoUserId) {
    if (photoUserId === user.id) {
      canEdit = true;
    } else {
      canEdit = await checkIsAdmin(supabase);
    }
  }
  return { canEdit, viewerId };
});
