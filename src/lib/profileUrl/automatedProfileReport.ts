/** Shown as the reporter on automatic profile reports. */
export const LINK_CHECK_REPORTER_NAME = 'Automated check';

/** Earlier name, still recognized so existing reports stay labeled as automated. */
export const LINK_CHECK_REPORTER_NAMES = [LINK_CHECK_REPORTER_NAME, 'Link check'] as const;

export function isAutomatedProfileReport(report: {
  reporter_id: string | null;
  reporter_name: string | null;
}): boolean {
  return !report.reporter_id
    && LINK_CHECK_REPORTER_NAMES.includes(report.reporter_name as (typeof LINK_CHECK_REPORTER_NAMES)[number]);
}
