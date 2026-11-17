import { checkIsAdmin } from '@/lib/auth/checkIsAdmin';
import {
  isStoredAuthSessionFresh,
  readStoredAuthSession,
} from '@/utils/supabase/authCookie';
import { createClient } from '@/utils/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
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
  const cookieStore = await cookies();
  const session = readStoredAuthSession(cookieStore.getAll());
  if (!session) {
    return { canEdit: false, viewerId: null, deferAuth: false };
  }

  // getUser() refreshes an expired access token and rotates the refresh token.
  // This runs in a Server Component, which cannot write the new cookies back,
  // so the browser keeps the old refresh token and the session dies within
  // the 10s reuse window. Read the cookie instead, and only touch Auth when
  // the access token is still comfortably valid.
  if (!isStoredAuthSessionFresh(session.expiresAt)) {
    return { canEdit: false, viewerId: null, deferAuth: true };
  }

  const viewerId = session.userId;
  if (photoUserId && photoUserId === viewerId) {
    return { canEdit: true, viewerId, deferAuth: false };
  }

  const supabase = await createClient();
  const canEdit = photoUserId ? await checkIsAdmin(supabase) : false;
  return { canEdit, viewerId, deferAuth: false };
});
