import { render } from '@react-email/render';

import { MemberNotificationEmail } from '@/emails/member-notification';
import { notifyAdmins } from '@/lib/notifications/notifyAdmins';
import { adminSupabase } from '@/utils/supabase/admin';

export async function notifyAdminsOfMemberSignedUp(userId: string): Promise<void> {
  const { data: existing } = await adminSupabase
    .from('notifications')
    .select('id')
    .eq('type', 'member_signed_up')
    .eq('actor_id', userId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return;
  }

  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('id, full_name, nickname, email, avatar_url')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching profile for member signed up notify:', profileError);
    return;
  }

  const memberName = profile.full_name || profile.nickname || profile.email || 'A new user';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  await notifyAdmins({
    excludeUserIds: [userId],
    notification: {
      actorId: userId,
      type: 'member_signed_up',
      entityType: 'profile',
      entityId: userId,
      data: {
        title: profile.email || memberName,
        thumbnail: profile.avatar_url,
        link: '/admin/members',
        actorName: memberName,
        actorNickname: profile.nickname,
        actorAvatar: profile.avatar_url,
      },
    },
    buildEmail: async (admin) => {
      const html = await render(
        MemberNotificationEmail({
          kind: 'signed_up',
          adminName: admin.full_name || 'Admin',
          memberName,
          memberNickname: profile.nickname,
          memberEmail: profile.email,
          profileLink: null,
          membersLink: `${baseUrl}/admin/members`,
        }),
      );

      return {
        subject: `New signup: ${memberName}`,
        html,
      };
    },
  });
}
