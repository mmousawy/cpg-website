import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';

export const EMAIL_TYPE_KEYS = ['events', 'photo_challenges', 'newsletter'] as const;
export type EmailTypeKey = (typeof EMAIL_TYPE_KEYS)[number];

export function isEmailTypeKey(value: string): value is EmailTypeKey {
  return (EMAIL_TYPE_KEYS as readonly string[]).includes(value);
}

export type EmailRecipientProfile = {
  id: string;
  email: string;
  full_name: string | null;
  nickname: string | null;
  created_at: string | null;
  newsletter_opt_in: boolean | null;
  optedOut: boolean;
  previouslySent: boolean;
  sentAt: string | null;
};

export type GetEmailRecipientsOptions = {
  emailType: EmailTypeKey;
  eventId?: number;
};

/** Service-role lookup — `profiles.email` is not granted to authenticated. */
export async function getEmailRecipients(
  adminSupabase: SupabaseClient<Database>,
  options: GetEmailRecipientsOptions,
): Promise<{ recipients: EmailRecipientProfile[]; error: string | null }> {
  const { emailType, eventId } = options;
  const { data: allProfiles, error: profilesError } = await adminSupabase
    .from('profiles')
    .select('id, email, full_name, nickname, created_at, newsletter_opt_in')
    .is('suspended_at', null)
    .is('deletion_scheduled_at', null)
    .not('email', 'is', null)
    .order('created_at', { ascending: true });

  if (profilesError) {
    return { recipients: [], error: profilesError.message };
  }

  if (!allProfiles || allProfiles.length === 0) {
    return { recipients: [], error: null };
  }

  const { data: emailTypeRow, error: emailTypeError } = await adminSupabase
    .from('email_types')
    .select('id')
    .eq('type_key', emailType)
    .maybeSingle();

  if (emailTypeError) {
    return { recipients: [], error: emailTypeError.message };
  }

  if (!emailTypeRow) {
    return { recipients: [], error: `${emailType} email type not found` };
  }

  const { data: optedOutUsers, error: optedOutError } = await adminSupabase
    .from('email_preferences')
    .select('user_id')
    .eq('email_type_id', emailTypeRow.id)
    .eq('opted_out', true);

  if (optedOutError) {
    return { recipients: [], error: optedOutError.message };
  }

  const optedOutUserIds = new Set(
    (optedOutUsers || []).map((u) => u.user_id),
  );

  const sentAtByUserId = new Map<string, string>();
  if (eventId !== undefined) {
    const { data: sentRecipients, error: sentError } = await adminSupabase
      .from('event_announcement_recipients')
      .select('user_id, sent_at')
      .eq('event_id', eventId);

    if (sentError) {
      return { recipients: [], error: sentError.message };
    }

    for (const row of sentRecipients || []) {
      sentAtByUserId.set(row.user_id, row.sent_at);
    }
  }

  const recipients = allProfiles.flatMap((profile) => {
    if (!profile.email) return [];
    const optedOut = optedOutUserIds.has(profile.id)
      || (emailType === 'newsletter' && profile.newsletter_opt_in === false);
    const sentAt = sentAtByUserId.get(profile.id) ?? null;
    return [{
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      nickname: profile.nickname,
      created_at: profile.created_at,
      newsletter_opt_in: profile.newsletter_opt_in,
      optedOut,
      previouslySent: sentAt !== null,
      sentAt,
    }];
  });

  if (eventId !== undefined) {
    recipients.sort((a, b) => {
      const aPriority = a.optedOut ? 2 : a.previouslySent ? 1 : 0;
      const bPriority = b.optedOut ? 2 : b.previouslySent ? 1 : 0;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return (a.created_at ?? '').localeCompare(b.created_at ?? '');
    });
  }

  return { recipients, error: null };
}
