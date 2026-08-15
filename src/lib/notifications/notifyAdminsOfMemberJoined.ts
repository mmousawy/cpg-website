import { render } from '@react-email/render';

import { MemberNotificationEmail } from '@/emails/member-notification';
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
    buildEmail: async (admin) => {
      const html = await render(
        MemberNotificationEmail({
          kind: 'joined',
          adminName: admin.full_name || 'Admin',
          memberName,
          memberNickname: profile.nickname,
          memberEmail: profile.email,
          profileLink: `${baseUrl}${profileLinkRelative}`,
          membersLink: `${baseUrl}/admin/members`,
        }),
      );

      return {
        subject: `New member: ${memberName} joined the community`,
        html,
      };
    },
  });
}
