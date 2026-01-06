import { createClient } from './server'
import type { User } from '@supabase/supabase-js'

export type ServerProfile = {
  id: string
  full_name: string | null
  nickname: string | null
  avatar_url: string | null
  is_admin: boolean
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
    console.error('Error getting server auth:', error)
    return { user: null, profile: null }
  }
}

