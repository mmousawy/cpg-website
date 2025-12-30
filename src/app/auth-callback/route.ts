import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectTo = searchParams.get('redirectTo') || '/'

  if (code) {
    const supabase = await createClient()
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

      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth-error`)
}
