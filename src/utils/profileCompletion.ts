type ProfileCompletionFields = {
  email?: string | null;
  nickname?: string | null;
  full_name?: string | null;
  terms_accepted_at?: string | null;
};

type ProfileCompletionOptions = {
  fallbackEmail?: string | null;
};

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasValidTimestamp(value: string | null | undefined): boolean {
  if (!hasText(value)) return false;
  return !Number.isNaN(Date.parse(value.trim()));
}

export function isProfileComplete(
  profile: ProfileCompletionFields | null | undefined,
  options: ProfileCompletionOptions = {},
): boolean {
  if (!profile) return false;
  const effectiveEmail = hasText(profile.email) ? profile.email : options.fallbackEmail;
  return (
    hasText(profile.nickname)
    && hasText(profile.full_name)
    && hasText(effectiveEmail)
    && hasValidTimestamp(profile.terms_accepted_at)
  );
}
