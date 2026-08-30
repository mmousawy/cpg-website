import {
  cancelPendingFollowNotification,
  scheduleFollowNotification,
} from '@/lib/follows/scheduleFollowNotification';
import { revalidateFollow } from '@/app/actions/revalidate';
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type FollowRequest = {
  profileId: string;
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ isFollowing: false });
  }

  const profileId = request.nextUrl.searchParams.get('profileId');

  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
  }

  const { data: follow, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', profileId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ isFollowing: !!follow });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: FollowRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { profileId } = body;

  if (typeof profileId !== 'string' || !profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
  }

  if (profileId === user.id) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
  }

  const { data: targetProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, nickname, full_name, avatar_url, suspended_at, deletion_scheduled_at')
    .eq('id', profileId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!targetProfile || targetProfile.suspended_at || targetProfile.deletion_scheduled_at) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('full_name, nickname, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const { error: insertError } = await supabase
    .from('follows')
    .insert({
      follower_id: user.id,
      following_id: profileId,
    });

  if (insertError) {
    if (insertError.code === '23505') {
      await revalidateFollow(actorProfile?.nickname, targetProfile.nickname);
      return NextResponse.json({ success: true, isFollowing: true });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (actorProfile?.nickname) {
    await scheduleFollowNotification({
      followerId: user.id,
      followingId: profileId,
      data: {
        link: `/@${actorProfile.nickname}`,
        actorName: actorProfile.full_name || null,
        actorNickname: actorProfile.nickname,
        actorAvatar: actorProfile.avatar_url || null,
      },
    });
  }

  await revalidateFollow(actorProfile?.nickname, targetProfile.nickname);

  return NextResponse.json({ success: true, isFollowing: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profileId = request.nextUrl.searchParams.get('profileId');

  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
  }

  const [{ data: actorProfile }, { data: targetProfile }] = await Promise.all([
    supabase
      .from('profiles')
      .select('nickname')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('nickname')
      .eq('id', profileId)
      .maybeSingle(),
  ]);

  const { error: deleteError } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', profileId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await cancelPendingFollowNotification(user.id, profileId);

  await revalidateFollow(actorProfile?.nickname, targetProfile?.nickname);

  return NextResponse.json({ success: true, isFollowing: false });
}
