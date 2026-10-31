import type { ProfileUrlCheckResult } from '@/lib/profileUrl/checkProfileUrl';
import { notifyAdminsOfReport } from '@/lib/notifications/notifyAdminsOfReport';
import { isTestEmail } from '@/lib/auth/isTestEmail';
import { adminSupabase } from '@/utils/supabase/admin';

/** Shown as the reporter on automatic profile reports. */
export const LINK_CHECK_REPORTER_NAME = 'Automated check';

/** Earlier name, still recognized so existing reports stay labeled as automated. */
const LINK_CHECK_REPORTER_NAMES = [LINK_CHECK_REPORTER_NAME, 'Link check'] as const;

export function isAutomatedProfileReport(report: {
  reporter_id: string | null;
  reporter_name: string | null;
}): boolean {
  return !report.reporter_id
    && LINK_CHECK_REPORTER_NAMES.includes(report.reporter_name as (typeof LINK_CHECK_REPORTER_NAMES)[number]);
}

function reportReason(checks: ProfileUrlCheckResult[]): string {
  if (checks.some((check) => check.reason === 'safe_browsing')) {
    return 'Unsafe website';
  }
  if (checks.some((check) => check.verdict === 'block')) {
    return 'Advertising a website';
  }
  return 'Unverified website';
}

function reportDetails(checks: ProfileUrlCheckResult[]): string {
  return checks
    .map((check) => {
      const title = check.title ? ` — ${check.title}` : '';
      return `${check.url} (${check.reason}${title})`;
    })
    .join('\n')
    .slice(0, 1000);
}

/**
 * Opens or updates a pending profile report, the same queue admins use for member reports.
 * A second save while that report is still pending updates the details and does not notify again.
 */
export async function fileProfileLinkReport(
  userId: string,
  checks: ProfileUrlCheckResult[],
): Promise<void> {
  const suspicious = checks.filter((check) => check.verdict !== 'allow');
  if (suspicious.length === 0) return;

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  if (isTestEmail(profile?.email)) return;

  const reason = reportReason(suspicious);
  const details = reportDetails(suspicious);

  const { data: existing } = await adminSupabase
    .from('reports')
    .select('id')
    .eq('entity_type', 'profile')
    .eq('entity_id', userId)
    .eq('status', 'pending')
    .is('reporter_id', null)
    .in('reporter_name', [...LINK_CHECK_REPORTER_NAMES])
    .maybeSingle();

  if (existing) {
    const { error } = await adminSupabase
      .from('reports')
      .update({
        reason,
        details,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      console.error('Error updating profile link report:', error);
    }
    return;
  }

  const { data: report, error } = await adminSupabase
    .from('reports')
    .insert({
      reporter_id: null,
      reporter_email: null,
      reporter_name: LINK_CHECK_REPORTER_NAME,
      entity_type: 'profile',
      entity_id: userId,
      reason,
      details,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !report) {
    console.error('Error filing profile link report:', error);
    return;
  }

  await notifyAdminsOfReport(report.id);
}
