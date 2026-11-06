import { isServiceAccountUserId, rememberServiceAccountFromProfile } from '@/lib/auth/serviceAccount';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * E2E and unit-test accounts use reserved addresses.
 * Outbound email and notifications must not run for these users.
 */
export function isTestEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return (
    normalized.endsWith('@test.local')
    || normalized.endsWith('@test.example.com')
    || normalized.includes('test-e2e-')
    || normalized.includes('test-signup-')
    || normalized === 'bot@creativephotography.group'
  );
}

export function isTestNotificationEnvironment(): boolean {
  return (
    process.env.RESEND_API_KEY?.startsWith('re_test') === true
    || process.env.NODE_ENV === 'test'
  );
}

export type SkipNotificationsOptions = {
  userId?: string | null;
  /** When known from a profile row (avoids extra DB lookup). */
  isServiceAccount?: boolean | null;
};

/** Skip transactional email (and matching notification side effects) for test users/envs and service accounts. */
export function shouldSkipNotificationsAndEmails(
  email?: string | null,
  options?: SkipNotificationsOptions,
): boolean {
  if (isTestNotificationEnvironment() || isTestEmail(email)) return true;
  if (options?.isServiceAccount === true) return true;
  if (isServiceAccountUserId(options?.userId)) return true;
  return false;
}

export async function userIdsIncludeTestUser(
  ...userIds: Array<string | null | undefined>
): Promise<boolean> {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return false;
  if (ids.some((id) => isServiceAccountUserId(id))) return true;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, email, is_service_account')
    .in('id', ids);

  for (const profile of data ?? []) {
    rememberServiceAccountFromProfile(profile);
    if (profile.is_service_account === true || isTestEmail(profile.email)) {
      return true;
    }
  }
  return false;
}
