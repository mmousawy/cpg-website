import type { Json, TablesUpdate } from '@/database.types';
import { revalidateAll } from '@/app/actions/revalidate';
import { isClearAutomaticSuspensionReason } from '@/lib/accountDeletion/deletionSource';
import { purgeAccountByUserId } from '@/lib/accountDeletion/purgeAccountByUserId';
import { evaluateProfileModeration } from '@/lib/memberReview/evaluateProfileModeration';
import {
  blockClientIpsForProfile,
  upsertSignupSignal,
} from '@/lib/memberReview/ipBlocking';
import { getRequestClientMeta } from '@/lib/memberReview/requestClientMeta';
import { buildLinkPublishState } from '@/lib/profileUrl/buildLinkPublishState';
import { fileModerationReport } from '@/lib/profileUrl/fileProfileLinkReport';
import { notifyAdminsOfMemberJoined } from '@/lib/notifications/notifyAdminsOfMemberJoined';
import { shouldSkipNotificationsAndEmails } from '@/lib/auth/isTestEmail';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type SocialLinkBody = { label: string; url: string };

type CompleteBody = {
  nickname?: string;
  fullName?: string | null;
  email?: string;
  bio?: string | null;
  website?: string | null;
  socialLinks?: SocialLinkBody[];
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bannerBlurhash?: string | null;
  newsletterOptIn?: boolean;
  theme?: string;
  motion?: string;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as CompleteBody;
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
    if (!nickname) {
      return NextResponse.json({ error: 'Nickname is required' }, { status: 400 });
    }

    const website = typeof body.website === 'string' ? body.website.trim() : '';
    const bio = typeof body.bio === 'string' ? body.bio : '';
    const socialLinks: SocialLinkBody[] = Array.isArray(body.socialLinks)
      ? body.socialLinks
        .filter((l): l is SocialLinkBody => l !== null && typeof l === 'object')
        .map((l) => ({
          label: typeof l.label === 'string' ? l.label : '',
          url: typeof l.url === 'string' ? l.url : '',
        }))
        .filter((l) => l.label.trim() && l.url.trim())
      : [];

    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() || null : null;
    const termsAt = new Date().toISOString();

    const { state, checks } = await buildLinkPublishState({
      website: website || null,
      socialLinks,
      bio: bio || null,
      memberFullName: fullName,
    });

    const clientMeta = getRequestClientMeta(request);
    await upsertSignupSignal(user.id, clientMeta, 'onboarding_complete');

    const moderation = await evaluateProfileModeration({
      nickname,
      fullName,
      website: website || null,
      bio: bio || null,
      socialLinks,
      checks,
      clientIp: clientMeta.ip,
    });

    const admin = createAdminClient();
    const profileUpdate: TablesUpdate<'profiles'> = {
      nickname,
      full_name: fullName,
      bio: bio || null,
      website: website || null,
      social_links: socialLinks.length > 0 ? socialLinks : null,
      link_publish_state: state as unknown as Json,
      avatar_url: body.avatarUrl ?? null,
      banner_url: body.bannerUrl ?? null,
      banner_blurhash: body.bannerBlurhash ?? null,
      newsletter_opt_in: body.newsletterOptIn ?? true,
      terms_accepted_at: termsAt,
      theme: body.theme ?? null,
      motion: body.motion ?? null,
      under_review_at: null,
    };

    if (typeof body.email === 'string' && body.email.trim()) {
      profileUpdate.email = body.email.trim().toLowerCase();
    }

    if (moderation.outcome === 'suspend') {
      profileUpdate.suspended_at = termsAt;
      profileUpdate.suspended_reason = moderation.suspendedReason;
    } else if (moderation.outcome === 'under_review') {
      profileUpdate.under_review_at = termsAt;
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id);

    if (updateError) {
      console.error('onboarding complete update error:', updateError);
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'This nickname is already taken' }, { status: 409 });
      }
      if (updateError.message.includes('under_review_at')) {
        return NextResponse.json(
          { error: 'Member review is not available until the database migration is applied.' },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (
      !(moderation.outcome === 'suspend' && isClearAutomaticSuspensionReason(moderation.suspendedReason))
    ) {
      await fileModerationReport(user.id, moderation, { fullName, bio: bio || null });
    }

    if (moderation.outcome === 'suspend') {
      await blockClientIpsForProfile(user.id, moderation.suspendedReason);
      if (isClearAutomaticSuspensionReason(moderation.suspendedReason)) {
        const purge = await purgeAccountByUserId(user.id, { retainSuspendedFingerprint: true });
        if (!purge.ok) {
          return NextResponse.json({ error: purge.error }, { status: 500 });
        }
        await revalidateAll();
        return NextResponse.json({
          success: true,
          outcome: moderation.outcome,
        });
      }
    }

    if (moderation.outcome === 'publish') {
      const { data: profile } = await admin
        .from('profiles')
        .select('email, full_name, nickname, terms_accepted_at')
        .eq('id', user.id)
        .single();

      if (
        profile
        && !shouldSkipNotificationsAndEmails(profile.email ?? user.email)
      ) {
        const { data: existing } = await admin
          .from('notifications')
          .select('id')
          .eq('type', 'member_joined')
          .eq('actor_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!existing) {
          try {
            await notifyAdminsOfMemberJoined(user.id);
          } catch (err) {
            console.error('Error notifying admins of new member:', err);
          }
        }
      }
    }

    if (moderation.outcome !== 'publish') {
      await revalidateAll();
    }

    return NextResponse.json({
      success: true,
      outcome: moderation.outcome,
    });
  } catch (error) {
    console.error('onboarding complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
