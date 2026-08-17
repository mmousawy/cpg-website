import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, after, type NextRequest } from 'next/server';

import { notifyAdminsOfMemberSignedUp } from '@/lib/notifications/notifyAdminsOfMemberSignedUp';
import { shouldSkipNotificationsAndEmails } from '@/lib/auth/isTestEmail';
import { getPostLoginRedirect } from '@/utils/postLoginRedirect';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectToParam = searchParams.get('redirectTo');

  if (code) {
    const cookieStore = await cookies();

    const finalRedirect = getPostLoginRedirect(redirectToParam);
    const response = NextResponse.redirect(`${origin}${finalRedirect}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // Set cookies on both the cookie store AND the response
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user profile exists, if not create one
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profileData } = await supabase.rpc('get_own_profile');
        const profile = profileData && typeof profileData === 'object' && !Array.isArray(profileData)
          ? profileData as Record<string, unknown>
          : null;

        if (!profile) {
          // Create profile for new user
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
          // Account is scheduled for deletion — sign out and redirect to notice page
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/account-deleted`);
        } else {
          // Update last logged in and sync OAuth avatar if user hasn't set a custom one
          const oauthAvatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
          const updateData: Record<string, unknown> = {
            last_logged_in: new Date().toISOString(),
          };

          // Only update avatar if profile doesn't have one (user hasn't uploaded custom)
          // and OAuth provides one
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
      }

      return response;
    }

    // Exchange failed - redirect to error page
    return NextResponse.redirect(`${origin}/auth-error`);
  }

  // No code provided - redirect to error page
  return NextResponse.redirect(`${origin}/auth-error`);
}
