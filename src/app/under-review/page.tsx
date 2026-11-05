import Link from 'next/link';

import UnderReviewSignOut from '@/components/account/UnderReviewSignOut';
import PageContainer from '@/components/layout/PageContainer';
import PageHeading from '@/components/layout/PageHeading';
import { routes } from '@/config/routes';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function UnderReviewPage() {
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

  return (
    <PageContainer>
      <PageHeading
        title="Account under review"
      />
      <div
        className="prose prose-neutral dark:prose-invert max-w-xl"
      >
        <p>
          Thanks for joining Creative Photography Group. Your account is set up, but your profile
          is not public yet. We review new members when a website or link could not be verified
          automatically.
        </p>
        <p>
          An admin will approve your account soon. Until then you cannot upload photos or use
          member features. You can still sign out or read our policies below.
        </p>
        <ul>
          <li>
            <Link
              href={routes.terms.url}
            >{routes.terms.label}</Link>
          </li>
          <li>
            <Link
              href={routes.privacy.url}
            >{routes.privacy.label}</Link>
          </li>
          <li>
            <Link
              href={routes.help.url}
            >{routes.help.label}</Link>
          </li>
        </ul>
        <UnderReviewSignOut />
      </div>
    </PageContainer>
  );
}
