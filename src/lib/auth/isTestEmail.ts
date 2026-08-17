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
  );
}

export function isTestNotificationEnvironment(): boolean {
  return (
    process.env.RESEND_API_KEY?.startsWith('re_test') === true
    || process.env.NODE_ENV === 'test'
  );
}

/** Skip transactional email (and matching notification side effects) for test users/envs. */
export function shouldSkipNotificationsAndEmails(email?: string | null): boolean {
  return isTestNotificationEnvironment() || isTestEmail(email);
}

export async function userIdsIncludeTestUser(
  ...userIds: Array<string | null | undefined>
): Promise<boolean> {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return false;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .in('id', ids);

  return data?.some((profile) => isTestEmail(profile.email)) === true;
}
