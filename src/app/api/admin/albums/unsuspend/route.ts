import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { albumId } = await request.json()

    if (!albumId) {
      return NextResponse.json({ error: 'Album ID is required' }, { status: 400 })
    }

    // Unsuspend the album
    // Type assertion needed until Supabase types are regenerated after migration
    const { error: updateError } = await supabase
      .from('albums')
      .update({
        is_suspended: false,
        suspended_at: null,
        suspended_by: null,
        suspension_reason: null,
      } as any)
      .eq('id', albumId)

    if (updateError) {
      console.error('Error unsuspending album:', updateError)
      return NextResponse.json({ error: 'Failed to unsuspend album' }, { status: 500 })
    }

    // Get album info for revalidation
    const { data: album } = await supabase
      .from('albums')
      .select('slug, user_id')
      .eq('id', albumId)
      .single()

    if (album) {
      const { data: owner } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', album.user_id)
        .single()

      if (owner?.nickname) {
        revalidatePath(`/@${owner.nickname}/${album.slug}`)
        revalidatePath(`/@${owner.nickname}`)
      }
    }
    revalidatePath('/galleries')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

