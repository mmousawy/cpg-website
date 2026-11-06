export type DeletionSource = 'self' | 'admin' | 'inactivity' | 'suspension';

/** Reasons that trigger immediate purge after onboarding; no email to user. */
export const CLEAR_AUTOMATIC_SUSPENSION_REASONS = [
  'Repeat of a suspended account',
  'Advertising a website',
  'Unsafe website',
] as const;

export type ClearAutomaticSuspensionReason = (typeof CLEAR_AUTOMATIC_SUSPENSION_REASONS)[number];

export function isClearAutomaticSuspensionReason(reason: string | null | undefined): boolean {
  if (!reason) return false;
  return (CLEAR_AUTOMATIC_SUSPENSION_REASONS as readonly string[]).includes(reason);
}

/** Admin-scheduled suspension: send 30-day deletion email (not an automatic signup reason). */
export function shouldEmailSuspensionDeletion(reason: string | null | undefined): boolean {
  return !isClearAutomaticSuspensionReason(reason);
}
