import { revalidateAll } from '@/app/actions/revalidate';
import { isClearAutomaticSuspensionReason, shouldEmailSuspensionDeletion } from '@/lib/accountDeletion/deletionSource';
import { isEligibleForInactivityDeletion } from '@/lib/accountDeletion/inactivityEligibility';
import { purgeAccountByUserId } from '@/lib/accountDeletion/purgeAccountByUserId';
import { shouldSkipNotificationsAndEmails } from '@/lib/auth/isTestEmail';
import { sendAppEmail } from '@/lib/email/sendAppEmail';
import { createAdminClient } from '@/utils/supabase/admin';
import { render } from '@react-email/render';
import { NextRequest, NextResponse } from 'next/server';

import { AdminSuspensionDeletionScheduledEmail } from '@/emails/admin-suspension-deletion-scheduled';
import { InactivityDeletionScheduledEmail } from '@/emails/inactivity-deletion-scheduled';

const BATCH_LIMIT = 25;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set');
    return NextResponse.json({ message: 'Cron secret not configured' }, { status: 500 });
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const results = {
    timestamp: now.toISOString(),
    inactivityScheduled: 0,
    inactivityEmailsFailed: 0,
    autoSuspendPurged: 0,
    autoSuspendFailed: 0,
    adminSuspensionScheduled: 0,
    adminSuspensionEmailsFailed: 0,
    errors: [] as string[],
  };

  try {
    // 1) Immediate purge: clear automatic suspensions (bots), cap per run
    const { data: autoRows, error: autoErr } = await supabase
      .from('profiles')
      .select('id, suspended_reason')
      .not('suspended_at', 'is', null)
      .is('deletion_scheduled_at', null)
      .limit(500);

    if (autoErr) {
      results.errors.push(`auto suspend query: ${autoErr.message}`);
    } else {
      const toPurge = (autoRows ?? [])
        .filter((r) => isClearAutomaticSuspensionReason(r.suspended_reason))
        .slice(0, BATCH_LIMIT);

      for (const row of toPurge) {
        const purge = await purgeAccountByUserId(row.id, { retainSuspendedFingerprint: true });
        if (purge.ok) {
          results.autoSuspendPurged += 1;
        } else {
          results.autoSuspendFailed += 1;
          results.errors.push(`purge ${row.id}: ${purge.error}`);
        }
      }
    }

    // 2) Backfill deletion schedule for admin suspensions
    const { data: suspendedProfiles, error: suspErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, nickname, suspended_reason, suspended_at, deletion_scheduled_at, is_admin')
      .not('suspended_at', 'is', null)
      .is('deletion_scheduled_at', null);

    if (suspErr) {
      results.errors.push(`suspended query: ${suspErr.message}`);
    } else {
      for (const row of suspendedProfiles ?? []) {
        if (row.is_admin) continue;
        if (isClearAutomaticSuspensionReason(row.suspended_reason)) continue;

        const scheduleAt = row.suspended_at ?? now.toISOString();
        const { error: updErr } = await supabase
          .from('profiles')
          .update({
            deletion_scheduled_at: scheduleAt,
            deletion_source: 'suspension',
          })
          .eq('id', row.id);

        if (updErr) {
          results.errors.push(`schedule suspension ${row.id}: ${updErr.message}`);
          continue;
        }

        results.adminSuspensionScheduled += 1;

        const email = row.email;
        if (email && shouldEmailSuspensionDeletion(row.suspended_reason) && !shouldSkipNotificationsAndEmails(email)) {
          const deletionDate = new Date(scheduleAt);
          deletionDate.setDate(deletionDate.getDate() + 30);
          try {
            const html = await render(
              AdminSuspensionDeletionScheduledEmail({
                fullName: row.full_name || row.nickname || email,
                recipientEmail: email,
                deletionDate: deletionDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
              }),
            );
            await sendAppEmail({
              from: 'Creative Photography Group <noreply@creativephotography.group>',
              to: email,
              subject: 'Your suspended account is scheduled for deletion',
              html,
            });
          } catch (e) {
            results.adminSuspensionEmailsFailed += 1;
            results.errors.push(`admin suspension email ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
    }

    // 3) Inactivity scheduling
    const { count: adminCount, error: adminCountErr } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_admin', true)
      .is('deletion_scheduled_at', null);

    if (adminCountErr) {
      results.errors.push(`admin count: ${adminCountErr.message}`);
    }

    const { data: candidates, error: candErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, nickname, created_at, last_logged_in, is_admin, suspended_at, deletion_scheduled_at, terms_accepted_at')
      .is('deletion_scheduled_at', null)
      .is('suspended_at', null)
      .limit(2000);

    if (candErr) {
      results.errors.push(`inactivity candidates: ${candErr.message}`);
    } else {
      const eligible = (candidates ?? []).filter((p) => {
        if (p.is_admin && (adminCount ?? 0) <= 1) return false;
        return isEligibleForInactivityDeletion({
          now,
          createdAt: p.created_at,
          lastLoggedIn: p.last_logged_in,
        });
      });

      const batch = eligible.slice(0, BATCH_LIMIT);
      for (const p of batch) {
        const { error: updErr } = await supabase
          .from('profiles')
          .update({
            deletion_scheduled_at: now.toISOString(),
            deletion_source: 'inactivity',
          })
          .eq('id', p.id);

        if (updErr) {
          results.errors.push(`inactivity schedule ${p.id}: ${updErr.message}`);
          continue;
        }

        results.inactivityScheduled += 1;

        const email = p.email;
        if (email && !shouldSkipNotificationsAndEmails(email)) {
          const deletionDate = new Date(now);
          deletionDate.setDate(deletionDate.getDate() + 30);
          try {
            const html = await render(
              InactivityDeletionScheduledEmail({
                fullName: p.full_name || p.nickname || email,
                recipientEmail: email,
                deletionDate: deletionDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
              }),
            );
            await sendAppEmail({
              from: 'Creative Photography Group <noreply@creativephotography.group>',
              to: email,
              subject: 'Sign in to keep your Creative Photography Group account',
              html,
            });
          } catch (e) {
            results.inactivityEmailsFailed += 1;
            results.errors.push(`inactivity email ${p.id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
    }

    if (
      results.inactivityScheduled > 0
      || results.autoSuspendPurged > 0
      || results.adminSuspensionScheduled > 0
    ) {
      await revalidateAll();
    }

    return NextResponse.json({ message: 'Schedule cron completed', results });
  } catch (error) {
    console.error('schedule-inactive-deletions error:', error);
    return NextResponse.json(
      {
        message: 'Cron failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        results,
      },
      { status: 500 },
    );
  }
}
