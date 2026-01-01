import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Pages that should redirect to user dashboard after login
const PUBLIC_LISTING_PAGES = ['/', '/past-meetups']

// Determine the final redirect destination after login
function getPostLoginRedirect(redirectTo: string | null): string {
  // If no explicit redirect or it's a public listing page, go to user dashboard
  if (!redirectTo || PUBLIC_LISTING_PAGES.includes(redirectTo)) {
    return '/account/events'
  }
  
  // Otherwise, return to the requested page (specific album, event, etc.)
  return redirectTo
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectToParam = searchParams.get('redirectTo')

  if (code) {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if user profile exists, if not create one
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select()
          .eq('id', user.id)
          .single()

        if (!profile) {
          // Create profile for new user
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          })
        } else {
          // Update last logged in
          await supabase
            .from('profiles')
            .update({ last_logged_in: new Date().toISOString() })
            .eq('id', user.id)
        }
      }

      const finalRedirect = getPostLoginRedirect(redirectToParam)
      
      // Create redirect response
      const response = NextResponse.redirect(`${origin}${finalRedirect}`)
      
      // Copy all cookies from cookieStore to the response
      // This ensures auth cookies are sent with the redirect
      cookieStore.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        })
      })
      
      return response
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth-error`)
}
