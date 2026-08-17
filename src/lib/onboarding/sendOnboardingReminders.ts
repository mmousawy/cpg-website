import { Resend } from 'resend';
import { render } from '@react-email/render';

import { shouldSkipNotificationsAndEmails } from '@/lib/auth/isTestEmail';
import { OnboardingReminderEmail } from '@/emails/onboarding-reminder';
import { getEmailSiteUrl } from '@/emails/utils/siteUrl';
import { adminSupabase } from '@/utils/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY!);
const ONBOARDING_REMINDER_DAYS = 7;
const BATCH_SIZE = 100;

export type OnboardingReminderResult = {
  sent: number;
  failed: number;
  skipped: number;
};

export async function sendOnboardingReminders(): Promise<OnboardingReminderResult> {
  const result: OnboardingReminderResult = { sent: 0, failed: 0, skipped: 0 };
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ONBOARDING_REMINDER_DAYS);
  const cutoffISO = cutoff.toISOString();
  const siteUrl = getEmailSiteUrl();
  const onboardingLink = `${siteUrl}/onboarding`;
  const contactLink = `${siteUrl}/contact`;
  const nowISO = new Date().toISOString();

  const { data: profiles, error } = await adminSupabase
    .from('profiles')
    .select('id, email, full_name')
    .is('terms_accepted_at', null)
    .is('onboarding_reminder_sent_at', null)
    .is('deletion_scheduled_at', null)
    .is('suspended_at', null)
    .not('email', 'is', null)
    .not('last_logged_in', 'is', null)
    .lte('created_at', cutoffISO);

  if (error) {
    console.error('Error fetching incomplete onboarding profiles:', error);
    throw error;
  }

  if (!profiles?.length) {
    return result;
  }

  const skippedIds: string[] = [];

  const prepared = await Promise.all(
    profiles.map(async (profile) => {
      const email = profile.email;
      if (!email || shouldSkipNotificationsAndEmails(email)) {
        result.skipped += 1;
        skippedIds.push(profile.id);
        return null;
      }

      const html = await render(
        OnboardingReminderEmail({
          fullName: profile.full_name,
          onboardingLink,
          contactLink,
        }),
      );

      return {
        profileId: profile.id,
        payload: {
          from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
          replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
          to: email,
          subject: 'Finish setting up your profile',
          html,
        },
      };
    }),
  );

  const toSend = prepared.filter(
    (item): item is NonNullable<typeof item> => item !== null,
  );

  for (let i = 0; i < toSend.length; i += BATCH_SIZE) {
    const batch = toSend.slice(i, i + BATCH_SIZE);

    try {
      const sendResult = await resend.batch.send(batch.map((item) => item.payload));

      if (sendResult.error) {
        console.error('Error sending onboarding reminder batch:', sendResult.error);
        result.failed += batch.length;
        continue;
      }

      const sentIds = batch.map((item) => item.profileId);
      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({ onboarding_reminder_sent_at: nowISO })
        .in('id', sentIds);

      if (updateError) {
        console.error('Error marking onboarding reminders as sent:', updateError);
      }

      result.sent += batch.length;
    } catch (batchError) {
      console.error('Exception sending onboarding reminder batch:', batchError);
      result.failed += batch.length;
    }
  }

  if (skippedIds.length > 0) {
    const { error: skipUpdateError } = await adminSupabase
      .from('profiles')
      .update({ onboarding_reminder_sent_at: nowISO })
      .in('id', skippedIds);

    if (skipUpdateError) {
      console.error('Error marking skipped onboarding reminders:', skipUpdateError);
    }
  }

  return result;
}
