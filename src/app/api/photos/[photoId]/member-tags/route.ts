import { after, NextRequest, NextResponse } from 'next/server';

import { revalidateProfile } from '@/app/actions/revalidate';
import { expireTag } from '@/lib/cache/expireTag';
import { checkIsAdmin } from '@/lib/auth/checkIsAdmin';
import { fetchPhotoMemberTags } from '@/lib/data/photoMemberTags';
import { scheduleNotification } from '@/lib/notifications/schedule';
import { createClient } from '@/utils/supabase/server';

async function expireMemberTagReadCaches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  photoId: string,
  profileId: string,
) {
  const [{ data: profile }, { data: photo }] = await Promise.all([
    supabase.from('profiles').select('nickname').eq('id', profileId).maybeSingle(),
    supabase
      .from('photos')
      .select('short_id, profiles!photos_user_id_fkey(nickname)')
      .eq('id', photoId)
      .maybeSingle(),
  ]);

  if (profile?.nickname) expireTag(`profile-${profile.nickname}`);
  const ownerNickname = (photo?.profiles as unknown as { nickname: string | null } | null)?.nickname;
  if (ownerNickname) expireTag(`profile-${ownerNickname}`);
  if (photo?.short_id) expireTag(`photo-${photo.short_id}`);
}

async function revalidateTaggedMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('id', profileId)
    .maybeSingle();
  if (profile?.nickname) {
    await revalidateProfile(profile.nickname);
  }
}

type RouteContext = { params: Promise<{ photoId: string }> };

function clampUnit(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) return null;
  return number;
}

async function canManagePhotoMemberTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  photoId: string,
  userId: string,
): Promise<{ photo: { id: string; user_id: string | null } | null; canEdit: boolean }> {
  const { data: photo } = await supabase
    .from('photos')
    .select('id, user_id')
    .eq('id', photoId)
    .maybeSingle();

  if (!photo) {
    return { photo: null, canEdit: false };
  }

  if (photo.user_id === userId) {
    return { photo, canEdit: true };
  }

  const isAdmin = await checkIsAdmin(supabase);
  return { photo, canEdit: isAdmin };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { photoId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { photo, canEdit } = user
    ? await canManagePhotoMemberTags(supabase, photoId, user.id)
    : { photo: null as { id: string; user_id: string | null } | null, canEdit: false };

  if (!photo) {
    return NextResponse.json({ message: 'Photo not found' }, { status: 404 });
  }

  const tags = await fetchPhotoMemberTags(supabase, photoId);

  return NextResponse.json({
    tags,
    canEdit,
    viewerId: user?.id ?? null,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { photoId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { photo, canEdit } = await canManagePhotoMemberTags(supabase, photoId, user.id);
  if (!photo) {
    return NextResponse.json({ message: 'Photo not found' }, { status: 404 });
  }
  if (!canEdit) {
    return NextResponse.json(
      { message: 'Only the photo owner (or a site admin) can tag people on this photo' },
      { status: 403 },
    );
  }

  let body: { profileId?: string; x?: unknown; y?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const x = clampUnit(body.x);
  const y = clampUnit(body.y);
  const profileId = body.profileId;
  if (!profileId || x == null || y == null) {
    return NextResponse.json({ message: 'A member and a point on the photo are required' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('photo_member_tags')
    .select('id')
    .eq('photo_id', photoId)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('photo_member_tags')
      .update({ x, y })
      .eq('id', existing.id);
    if (error) {
      return NextResponse.json({ message: 'Could not move that tag' }, { status: 403 });
    }
    await expireMemberTagReadCaches(supabase, photoId, profileId);
    after(() => {
      void revalidateTaggedMember(supabase, profileId).catch((revalidateError) => {
        console.error('member tag revalidate failed:', revalidateError);
      });
    });
    return NextResponse.json({ success: true, moved: true });
  }

  const { error } = await supabase.from('photo_member_tags').insert({
    photo_id: photoId,
    profile_id: profileId,
    x,
    y,
    created_by: user.id,
  });

  if (error) {
    return NextResponse.json({ message: 'Could not tag that member' }, { status: 403 });
  }

  const actorId = user.id;
  await expireMemberTagReadCaches(supabase, photoId, profileId);
  after(() => {
    void (async () => {
      await revalidateTaggedMember(supabase, profileId);
      if (profileId === actorId) return;

      const [{ data: actor }, { data: photo }] = await Promise.all([
        supabase.from('profiles').select('full_name, nickname, avatar_url').eq('id', actorId).maybeSingle(),
        supabase
          .from('photos')
          .select('title, url, short_id, profiles!photos_user_id_fkey(nickname)')
          .eq('id', photoId)
          .maybeSingle(),
      ]);
      const ownerNickname = (photo?.profiles as unknown as { nickname: string | null } | null)?.nickname;
      const actorNickname = actor?.nickname ?? null;
      if (!ownerNickname || !photo?.short_id) return;

      await scheduleNotification({
        userId: profileId,
        actorId,
        type: 'photo_member_tag',
        entityType: 'photo',
        entityId: photoId,
        data: {
          title: photo.title || 'Untitled photo',
          thumbnail: photo.url,
          link: `/@${ownerNickname}/photo/${photo.short_id}`,
          actorName: actor?.full_name || actorNickname,
          actorNickname,
          actorAvatar: actor?.avatar_url ?? null,
        },
        pendingEmail: {
          kind: 'photo_tag',
          actorName: actor?.full_name || actorNickname || 'Someone',
          actorNickname,
          actorAvatarUrl: actor?.avatar_url ?? null,
          actorProfileLink: actorNickname ? `/@${actorNickname}` : null,
          entityTitle: photo.title || 'Untitled photo',
          entityThumbnail: photo.url ?? null,
          entityLink: `/@${ownerNickname}/photo/${photo.short_id}`,
          contextLabel: 'a photo',
        },
      });
    })().catch((backgroundError) => {
      console.error('member tag background work failed:', backgroundError);
    });
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { photoId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const profileId = request.nextUrl.searchParams.get('profileId');
  if (!profileId) {
    return NextResponse.json({ message: 'profileId is required' }, { status: 400 });
  }

  const { photo, canEdit } = await canManagePhotoMemberTags(supabase, photoId, user.id);
  if (!photo) {
    return NextResponse.json({ message: 'Photo not found' }, { status: 404 });
  }
  const canRemove = canEdit || profileId === user.id;
  if (!canRemove) {
    return NextResponse.json({ message: 'You cannot remove that tag' }, { status: 403 });
  }

  const { error } = await supabase
    .from('photo_member_tags')
    .delete()
    .eq('photo_id', photoId)
    .eq('profile_id', profileId);

  if (error) {
    return NextResponse.json({ message: 'Could not remove that tag' }, { status: 403 });
  }

  await expireMemberTagReadCaches(supabase, photoId, profileId);
  after(() => {
    void revalidateTaggedMember(supabase, profileId).catch((revalidateError) => {
      console.error('member tag revalidate failed:', revalidateError);
    });
  });

  return NextResponse.json({ success: true });
}
