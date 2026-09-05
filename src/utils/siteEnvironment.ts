/**
 * Deployment environment helpers (staging vs production).
 * Staging is detected from NEXT_PUBLIC_SITE_URL set in Coolify.
 */
export function isStagingDeployment(): boolean {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().toLowerCase() ?? '';
  return siteUrl.includes('staging.creativephotography.group');
}
