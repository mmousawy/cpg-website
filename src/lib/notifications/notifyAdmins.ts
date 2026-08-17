import { Resend } from 'resend';

import { isTestEmail, userIdsIncludeTestUser } from '@/lib/auth/isTestEmail';
import { createNotification } from '@/lib/notifications/create';
import type { CreateNotificationParams } from '@/types/notifications';
import { adminSupabase } from '@/utils/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY!);

export type AdminRecipient = {
  id: string;
  full_name: string | null;
  email: string;
};

type NotifyAdminsOptions = {
  notification: Omit<CreateNotificationParams, 'userId'>;
  excludeUserIds?: string[];
  buildEmail: (admin: AdminRecipient) => Promise<{
    subject: string;
    html: string;
  }>;
};

export async function notifyAdmins({
  notification,
  excludeUserIds,
  buildEmail,
}: NotifyAdminsOptions): Promise<void> {
  if (await userIdsIncludeTestUser(notification.actorId)) {
    return;
  }

  const { data: admins, error: adminsError } = await adminSupabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('is_admin', true)
    .is('deletion_scheduled_at', null);

  if (adminsError || !admins?.length) {
    if (adminsError) console.error('Error fetching admins:', adminsError);
    return;
  }

  const excluded = new Set(excludeUserIds ?? []);
  const recipients = admins.filter((admin) => !excluded.has(admin.id));

  if (recipients.length === 0) {
    return;
  }

  await Promise.all(
    recipients.map((admin) =>
      createNotification({
        ...notification,
        userId: admin.id,
      }),
    ),
  );

  const adminsToEmail = recipients.filter(
    (admin): admin is AdminRecipient => Boolean(admin.email) && !isTestEmail(admin.email),
  );

  if (adminsToEmail.length === 0) {
    return;
  }

  try {
    const emails = await Promise.all(
      adminsToEmail.map(async (admin) => {
        const { subject, html } = await buildEmail(admin);

        return {
          from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
          replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
          to: admin.email,
          subject,
          html,
        };
      }),
    );

    if (emails.length > 0) {
      await resend.batch.send(emails);
    }
  } catch (emailError) {
    console.error('Error sending admin notification emails:', emailError);
  }
}
