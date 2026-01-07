import { createClient } from './server'
import type { User } from '@supabase/supabase-js'
import type { Tables } from '@/database.types'

export type ServerProfile = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'nickname' | 'avatar_url'> & {
  is_admin: boolean  // is_admin can be null in DB but we default to false
}

export type ServerAuth = {
  user: User | null
  profile: ServerProfile | null
}

/**
 * Get auth data on the server.
 * Use this in server components to pass auth data to client components.
 */
export async function getServerAuth(): Promise<ServerAuth> {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { user: null, profile: null }
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, nickname, avatar_url, is_admin')
      .eq('id', user.id)
      .single()

    return {
      user,
      profile: profile as ServerProfile | null
    }
  } catch (error) {
    // Silently fail during static generation (no cookies available)
    // This is expected behavior, not an error
    if (error instanceof Error && error.message.includes('Dynamic server usage')) {
      return { user: null, profile: null }
    }
    // Log actual errors
    console.error('Error getting server auth:', error)
    return { user: null, profile: null }
  }
}

