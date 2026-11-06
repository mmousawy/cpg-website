import { revalidateAll } from '@/app/actions/revalidate';
import { purgeAccountByUserId } from '@/lib/accountDeletion/purgeAccountByUserId';
import { isClearAutomaticSuspensionReason } from '@/lib/accountDeletion/deletionSource';
import type { OnboardingModerationResult } from '@/lib/memberReview/assessOnboardingModeration';
import { blockClientIpsForProfile } from '@/lib/memberReview/ipBlocking';
import { createAdminClient } from '@/utils/supabase/admin';

/** Apply hold/suspend after a later profile save. Does not clear an existing hold. */
export async function persistProfileModeration(
  userId: string,
  moderation: OnboardingModerationResult,
): Promise<void> {
  if (moderation.outcome === 'publish') return;

  const now = new Date().toISOString();
  const admin = createAdminClient();

  if (moderation.outcome === 'suspend') {
    if (isClearAutomaticSuspensionReason(moderation.suspendedReason)) {
      const { error: updErr } = await admin
        .from('profiles')
        .update({
          suspended_at: now,
          suspended_reason: moderation.suspendedReason,
        })
        .eq('id', userId);
      if (updErr) {
        console.error('persistProfileModeration suspend (auto):', updErr);
        return;
      }
      await blockClientIpsForProfile(userId, moderation.suspendedReason);
      const purge = await purgeAccountByUserId(userId, { retainSuspendedFingerprint: true });
      if (!purge.ok) {
        console.error('persistProfileModeration immediate purge:', purge.error);
      }
      await revalidateAll();
      return;
    }

    const { error } = await admin
      .from('profiles')
      .update({
        suspended_at: now,
        suspended_reason: moderation.suspendedReason,
      })
      .eq('id', userId);
    if (error) {
      console.error('persistProfileModeration suspend:', error);
      return;
    }
    await blockClientIpsForProfile(userId, moderation.suspendedReason);
  } else {
    const { error } = await admin
      .from('profiles')
      .update({ under_review_at: now })
      .eq('id', userId);
    if (error) {
      console.error('persistProfileModeration hold:', error);
      return;
    }
  }

  await revalidateAll();
}
