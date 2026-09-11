import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, after, type NextRequest } from 'next/server';

import { notifyAdminsOfMemberSignedUp } from '@/lib/notifications/notifyAdminsOfMemberSignedUp';
import { shouldSkipNotificationsAndEmails } from '@/lib/auth/isTestEmail';
import {
  applyOnboardingCookie,
  clearOnboardingCookie,
  ONBOARDING_COOKIE_COMPLETE,
  ONBOARDING_COOKIE_PENDING,
} from '@/utils/onboardingCookie';
import { getPostAuthRedirect, getPostLoginRedirect } from '@/utils/postLoginRedirect';
import { isProfileComplete, type ProfileCompletionFields } from '@/utils/profileCompletion';
import { getRequestSiteUrl } from '@/utils/requestSiteUrl';

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

function applyCookies(response: NextResponse, cookiesToSet: CookieToSet[]) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
}

function toCompletionProfile(
  profile: Record<string, unknown> | null,
): ProfileCompletionFields | null {
  if (!profile) return null;
  return {
    email: typeof profile.email === 'string' ? profile.email : null,
    nickname: typeof profile.nickname === 'string' ? profile.nickname : null,
    full_name: typeof profile.full_name === 'string' ? profile.full_name : null,
    terms_accepted_at: typeof profile.terms_accepted_at === 'string'
      ? profile.terms_accepted_at
      : null,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteUrl = getRequestSiteUrl(request);
  const code = searchParams.get('code');
  const redirectToParam = searchParams.get('redirectTo');

  if (code) {
    const cookieStore = await cookies();
    const cookiesToSet: CookieToSet[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(incoming) {
            incoming.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              cookiesToSet.push({ name, value, options });
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      let dest = getPostLoginRedirect(redirectToParam);

      if (user) {
        const { data: profileData } = await supabase.rpc('get_own_profile');
        const profile = profileData && typeof profileData === 'object' && !Array.isArray(profileData)
          ? profileData as Record<string, unknown>
          : null;

        if (!profile) {
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          });

          after(() => {
            if (shouldSkipNotificationsAndEmails(user.email)) return;
            void notifyAdminsOfMemberSignedUp(user.id).catch((err) => {
              console.error('Error notifying admins of signup:', err);
            });
          });
        } else if (profile.deletion_scheduled_at) {
          await supabase.auth.signOut();
          const deletedResponse = NextResponse.redirect(`${siteUrl}/account-deleted`);
          applyCookies(deletedResponse, cookiesToSet);
          clearOnboardingCookie(deletedResponse);
          return deletedResponse;
        } else {
          const oauthAvatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
          const updateData: Record<string, unknown> = {
            last_logged_in: new Date().toISOString(),
          };

          if (!profile.avatar_url && oauthAvatarUrl) {
            updateData.avatar_url = oauthAvatarUrl;
          }

          await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', user.id);

          if (!profile.terms_accepted_at) {
            after(() => {
              if (shouldSkipNotificationsAndEmails(user.email)) return;
              void notifyAdminsOfMemberSignedUp(user.id).catch((err) => {
                console.error('Error notifying admins of signup:', err);
              });
            });
          }
        }

        const completionProfile = toCompletionProfile(profile);
        dest = getPostAuthRedirect(completionProfile, redirectToParam, user.email ?? null);
        const response = NextResponse.redirect(`${siteUrl}${dest}`);
        applyCookies(response, cookiesToSet);
        applyOnboardingCookie(
          response,
          isProfileComplete(completionProfile, { fallbackEmail: user.email ?? null })
            ? ONBOARDING_COOKIE_COMPLETE
            : ONBOARDING_COOKIE_PENDING,
        );
        return response;
      }

      const response = NextResponse.redirect(`${siteUrl}${dest}`);
      applyCookies(response, cookiesToSet);
      return response;
    }

    return NextResponse.redirect(`${siteUrl}/auth-error`);
  }

  return NextResponse.redirect(`${siteUrl}/auth-error`);
}
