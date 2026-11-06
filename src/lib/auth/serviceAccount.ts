/**
 * Identities used only for automation (e.g. scene scraper `SCRAPER_USER_ID`), not interactive members.
 * Backed by `profiles.is_service_account` after migration; env UUID matches pre-sync builds.
 */

const CACHED_IDS = new Set<string>();

function scraperIdFromEnv(): string | null {
  const raw = process.env.SCRAPER_USER_ID?.trim();
  if (!raw) return null;
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRe.test(raw) ? raw : null;
}

/** True when this user id is the scraper bot (env) or marked service in DB. */
export function isServiceAccountUserId(id: string | null | undefined): boolean {
  if (!id) return false;
  if (CACHED_IDS.has(id)) return true;
  const envId = scraperIdFromEnv();
  if (envId && id === envId) return true;
  return false;
}

/** Call when loading a profile row so env-only detection works without a DB round-trip after deploy. */
export function rememberServiceAccountFromProfile(profile: {
  id: string;
  is_service_account?: boolean | null;
}): void {
  if (profile.is_service_account === true || isServiceAccountUserId(profile.id)) {
    CACHED_IDS.add(profile.id);
  }
}

export function isServiceAccountFromProfileRow(profile: {
  id: string;
  is_service_account?: boolean | null;
} | null | undefined): boolean {
  if (!profile) return false;
  return profile.is_service_account === true || isServiceAccountUserId(profile.id);
}
