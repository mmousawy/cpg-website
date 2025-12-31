import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AlbumFullSizeGallery from '@/components/album/AlbumFullSizeGallery'
import Comments from '@/components/shared/Comments'
import Avatar from '@/components/auth/Avatar'
import type { AlbumWithPhotos } from '@/types/albums'

// Revalidate every 60 seconds to reduce database queries
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ nickname: string; albumSlug: string }> }) {
  const resolvedParams = await params
  // Decode URL parameters and remove @ prefix from nickname if present
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '')
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname
  const albumSlug = resolvedParams?.albumSlug || ''

  if (!nickname || !albumSlug) {
    return {
      title: 'Album Not Found',
    }
  }

  const supabase = await createClient()

  // First get the user by nickname
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .single()

  if (!profile) {
    return {
      title: 'Album Not Found',
    }
  }

  const { data: album } = await supabase
    .from('albums')
    .select('title, description')
    .eq('user_id', profile.id)
    .eq('slug', albumSlug)
    .eq('is_public', true)
    .single()

  if (!album) {
    return {
      title: 'Album Not Found',
    }
  }

  return {
    title: `${album.title} - Photo Gallery`,
    description: album.description || `Photo album: ${album.title}`,
  }
}

export default async function PublicAlbumPage({ params }: { params: Promise<{ nickname: string; albumSlug: string }> }) {
  const resolvedParams = await params
  // Decode URL parameters and remove @ prefix from nickname if present
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '')
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname
  const albumSlug = resolvedParams?.albumSlug || ''

  console.log('🔍 Route params:', { rawNickname, nickname, albumSlug })

  if (!nickname || !albumSlug) {
    console.log('❌ Missing params')
    notFound()
  }

  const supabase = await createClient()

  // First get the user by nickname
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .single()

  console.log('👤 Profile lookup:', { nickname, profile, error: profileError })

  if (profileError || !profile) {
    console.log('❌ Profile not found')
    notFound()
  }

  // Fetch album with photos and user info
  // Only fetch necessary fields to reduce egress
  const { data: album, error } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      is_public,
      created_at,
      profile:profiles(full_name, avatar_url, nickname),
      photos:album_photos(
        id,
        photo_url,
        title,
        width,
        height,
        sort_order,
        image:images(exif_data)
      )
    `)
    .eq('user_id', profile.id)
    .eq('slug', albumSlug)
    .eq('is_public', true)
    .single()

  if (error || !album) {
    // Debug log for troubleshooting 404s
    console.error('Album fetch error:', error);
    console.error('Album fetch result:', album);
    notFound();
  }

  const albumWithPhotos = album as unknown as AlbumWithPhotos

  // Sort photos by sort_order
  const sortedPhotos = [...albumWithPhotos.photos].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  return (
    <section className="flex justify-center bg-background px-4 pb-8 pt-6 text-foreground sm:p-12 sm:pb-14">
      <div className="w-full max-w-screen-md">
        {/* Album Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <Avatar
              avatarUrl={albumWithPhotos.profile?.avatar_url}
              fullName={albumWithPhotos.profile?.full_name}
              size="md"
            />
            <div>
              <p className="font-medium">
                {albumWithPhotos.profile?.full_name || 'Unknown User'}
              </p>
              <p className="text-sm opacity-70">
                {albumWithPhotos.profile?.nickname ? `@${albumWithPhotos.profile.nickname}` : '@unknown'}
              </p>
            </div>
          </div>

          <h1 className="mb-3 text-3xl font-bold">{albumWithPhotos.title}</h1>
          {albumWithPhotos.description && (
            <p className="text-lg opacity-70">
              {albumWithPhotos.description}
            </p>
          )}
          <p className="mt-2 text-sm opacity-70">
            {sortedPhotos.length} {sortedPhotos.length === 1 ? 'photo' : 'photos'}
          </p>
        </div>

        {/* Gallery */}
        {sortedPhotos.length === 0 ? (
          <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
            <p className="opacity-70">
              This album doesn&apos;t have any photos yet.
            </p>
          </div>
        ) : (
          <AlbumFullSizeGallery photos={sortedPhotos} />
        )}

        {/* Comments Section */}
        <div className="mt-12">
          <Comments albumId={albumWithPhotos.id} />
        </div>
      </div>
    </section>
  )
}
