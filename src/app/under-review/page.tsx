import { Suspense } from 'react';
import LogoSVG from 'public/cpg-logo.svg';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import PageLoading from '@/components/shared/PageLoading';
import ModerationPreviewNotice from '@/components/memberReview/ModerationPreviewNotice';
import { routes } from '@/config/routes';
import {
  REVIEW_PREVIEW_COOKIE_NAME,
  REVIEW_PREVIEW_QUERY_PARAM,
  isPreviewFlagCookieSet,
  parsePreviewFlagQuery,
} from '@/lib/memberReview/blockPreview';
import { createClient } from '@/utils/supabase/server';

export default function UnderReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ 'preview-review'?: string }>;
}) {
  return (
    <Suspense
      fallback={<PageLoading />}
    >
      <UnderReviewGate
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function UnderReviewGate({
  searchParams,
}: {
  searchParams: Promise<{ 'preview-review'?: string }>;
}) {
  const params = await searchParams;
  const isPreview = parsePreviewFlagQuery(params[REVIEW_PREVIEW_QUERY_PARAM]) === 'enable'
    || isPreviewFlagCookieSet((await cookies()).get(REVIEW_PREVIEW_COOKIE_NAME)?.value);

  if (!isPreview) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      redirect(routes.login.url);
    }

    const { data: profileJson } = await supabase.rpc('get_own_profile');
    const profile = profileJson && typeof profileJson === 'object' && !Array.isArray(profileJson)
      ? profileJson as { under_review_at?: string | null; suspended_at?: string | null }
      : null;

    if (!profile?.under_review_at || profile.suspended_at) {
      redirect('/account/events');
    }
  }

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center"
    >
      <LogoSVG
        className="mb-8 block size-20 shrink-0 sm:size-24"
        aria-hidden
      />
      <h1
        className="mb-4 text-2xl font-bold font-heading sm:text-3xl"
      >
        Account under review
      </h1>
      <div
        className="max-w-md space-y-4 text-foreground/90 text-sm sm:text-base"
      >
        <p>
          Your profile is not public yet. We are reviewing a link on your account.
        </p>
        <p>
          You can browse the site, but likes, comments, follows, and other interactions stay
          locked. Your profile and account pages also stay locked until an admin approves you.
        </p>
        {isPreview && (
          <Suspense
            fallback={null}
          >
            <ModerationPreviewNotice
              queryParam={REVIEW_PREVIEW_QUERY_PARAM}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
