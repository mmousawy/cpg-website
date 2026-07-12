/** Query param that skips onboarding auth/completion redirects for design preview. */
export const ONBOARDING_PREVIEW_QUERY_PARAM = 'preview';

type SearchParamsLike = Pick<URLSearchParams, 'get'>;

/**
 * Returns true when onboarding should be shown without auth or profile-completion redirects.
 * Supports `?preview=true` and legacy `?test=true`.
 */
export function isOnboardingPreviewMode(searchParams: SearchParamsLike): boolean {
  return (
    searchParams.get(ONBOARDING_PREVIEW_QUERY_PARAM) === 'true' ||
    searchParams.get('test') === 'true'
  );
}
