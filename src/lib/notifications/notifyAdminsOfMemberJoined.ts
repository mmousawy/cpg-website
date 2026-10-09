import { isTestEmail } from '@/lib/auth/isTestEmail';
import { EMAIL_TEMPLATE_KEYS } from '@/lib/email/templateKeys';
import { notifyAdmins } from '@/lib/notifications/notifyAdmins';
import { adminSupabase } from '@/utils/supabase/admin';

export async function notifyAdminsOfMemberJoined(userId: string): Promise<void> {
  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('id, full_name, nickname, email, avatar_url')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching profile for member joined notify:', profileError);
    return;
  }

  if (isTestEmail(profile.email)) {
    return;
  }

  const memberName = profile.full_name || profile.nickname || 'A new member';
  const profileLinkRelative = profile.nickname ? `/@${profile.nickname}` : '/admin/members';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  await notifyAdmins({
    excludeUserIds: [userId],
    notification: {
      actorId: userId,
      type: 'member_joined',
      entityType: 'profile',
      entityId: userId,
      data: {
        title: profile.nickname ? `@${profile.nickname}` : memberName,
        thumbnail: profile.avatar_url,
        link: profileLinkRelative,
        actorName: memberName,
        actorNickname: profile.nickname,
        actorAvatar: profile.avatar_url,
      },
    },
    debouncedEmail: {
      batchKey: 'member_joined',
      templateKey: EMAIL_TEMPLATE_KEYS.memberNotification,
      buildItem: () => ({
        kind: 'joined',
        memberName,
        memberNickname: profile.nickname,
        memberEmail: profile.email,
        profileLink: `${baseUrl}${profileLinkRelative}`,
        membersLink: `${baseUrl}/admin/members`,
      }),
    },
  });
}
