import { render } from '@react-email/render';

import { MemberNotificationEmail } from '@/emails/member-notification';
import { notifyAdmins } from '@/lib/notifications/notifyAdmins';
import { adminSupabase } from '@/utils/supabase/admin';

export async function notifyAdminsOfAccountDeletion(
  userId: string,
  options: { initiatedByAdminId?: string } = {},
): Promise<void> {
  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('id, full_name, nickname, email, avatar_url, deletion_scheduled_at')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching profile for account deletion notify:', profileError);
    return;
  }

  const memberName = profile.full_name || profile.nickname || 'A member';
  const profileLinkRelative = profile.nickname ? `/@${profile.nickname}` : null;
  const membersLinkRelative = '/admin/members';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  const deletionAt = profile.deletion_scheduled_at
    ? new Date(profile.deletion_scheduled_at)
    : new Date();
  deletionAt.setDate(deletionAt.getDate() + 30);
  const deletionDate = deletionAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let initiatedByName: string | null = null;
  if (options.initiatedByAdminId) {
    const { data: adminProfile } = await adminSupabase
      .from('profiles')
      .select('full_name, nickname')
      .eq('id', options.initiatedByAdminId)
      .single();

    initiatedByName = adminProfile?.full_name || adminProfile?.nickname || 'An admin';
  }

  const initiatedByAdmin = Boolean(options.initiatedByAdminId);

  await notifyAdmins({
    excludeUserIds: [userId, options.initiatedByAdminId].filter(
      (id): id is string => Boolean(id),
    ),
    notification: {
      actorId: userId,
      type: 'member_deleted',
      entityType: 'profile',
      entityId: userId,
      data: {
        title: `Permanent deletion on ${deletionDate}`,
        thumbnail: profile.avatar_url,
        link: membersLinkRelative,
        actorName: memberName,
        actorNickname: profile.nickname,
        actorAvatar: profile.avatar_url,
        initiatedByAdmin,
        initiatedByName,
        deletionDate,
      },
    },
    buildEmail: async (admin) => {
      const html = await render(
        MemberNotificationEmail({
          kind: 'deleted',
          adminName: admin.full_name || 'Admin',
          memberName,
          memberNickname: profile.nickname,
          memberEmail: profile.email,
          profileLink: profileLinkRelative ? `${baseUrl}${profileLinkRelative}` : null,
          membersLink: `${baseUrl}${membersLinkRelative}`,
          deletionDate,
          initiatedByAdmin,
          initiatedByName,
        }),
      );

      return {
        subject: initiatedByAdmin
          ? `Account deletion scheduled: ${memberName}`
          : `${memberName} scheduled their account for deletion`,
        html,
      };
    },
  });
}
