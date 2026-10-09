import type { Json } from '@/database.types';
import { userIdsIncludeTestUser } from '@/lib/auth/isTestEmail';
import type { EmailTemplateKey } from '@/lib/email/templateKeys';
import { createNotification } from '@/lib/notifications/create';
import { enqueueDebouncedNotificationEmail } from '@/lib/notifications/emailQueue';
import type { CreateNotificationParams } from '@/types/notifications';
import { adminSupabase } from '@/utils/supabase/admin';

export type AdminRecipient = {
  id: string;
  full_name: string | null;
  email: string;
};

type NotifyAdminsDebouncedEmail = {
  batchKey: string;
  templateKey: EmailTemplateKey;
  emailType?: string;
  buildItem: () => Json;
};

type NotifyAdminsOptions = {
  notification: Omit<CreateNotificationParams, 'userId'>;
  excludeUserIds?: string[];
  debouncedEmail: NotifyAdminsDebouncedEmail;
};

export async function notifyAdmins({
  notification,
  excludeUserIds,
  debouncedEmail,
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

  const item = debouncedEmail.buildItem();

  for (const admin of recipients) {
    const { notificationId } = await createNotification({
      ...notification,
      userId: admin.id,
    });

    if (!admin.email) {
      continue;
    }

    await enqueueDebouncedNotificationEmail({
      recipientUserId: admin.id,
      batchKey: debouncedEmail.batchKey,
      templateKey: debouncedEmail.templateKey,
      emailType: debouncedEmail.emailType ?? 'notifications',
      notificationId,
      item,
    });
  }
}
