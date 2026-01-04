import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

// Pages that should redirect to user dashboard after login
const PUBLIC_LISTING_PAGES = ['/', '/events']

// Determine the final redirect destination after login
function getPostLoginRedirect(redirectTo: string | null): string {
  // If no explicit redirect or it's a public listing page, go to user dashboard
  if (!redirectTo || PUBLIC_LISTING_PAGES.includes(redirectTo)) {
    return '/account/events'
  }
  
  // Otherwise, return to the requested page (specific album, event, etc.)
  return redirectTo
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectToParam = searchParams.get('redirectTo')

  if (code) {
    const cookieStore = await cookies()
    
    // Create response first so we can set cookies on it
    const finalRedirect = getPostLoginRedirect(redirectToParam)
    const response = NextResponse.redirect(`${origin}${finalRedirect}`)
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            // Set cookies on both the cookie store AND the response
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
              response.cookies.set(name, value, options)
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

      return response
    }
    
    // Exchange failed - redirect to error page
    return NextResponse.redirect(`${origin}/auth-error`)
  }

  // No code provided - redirect to error page
  return NextResponse.redirect(`${origin}/auth-error`)
}
