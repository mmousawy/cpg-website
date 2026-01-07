import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createPublicClient } from '@/utils/supabase/server'
import AlbumFullSizeGallery from '@/components/album/AlbumFullSizeGallery'
import Comments from '@/components/shared/Comments'
import Avatar from '@/components/auth/Avatar'
import PageContainer from '@/components/layout/PageContainer'
import AlbumModerationPanel from '@/components/admin/AlbumModerationPanel'
import type { AlbumWithPhotos } from '@/types/albums'

// Cache indefinitely - revalidated on-demand when data changes

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

  const supabase = createPublicClient()

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
    title: `${album.title} by @${nickname}`,
    description: album.description || `Photo album "${album.title}" by @${nickname}`,
  }
}

export default async function PublicAlbumPage({ params }: { params: Promise<{ nickname: string; albumSlug: string }> }) {
  const resolvedParams = await params
  // Decode URL parameters and remove @ prefix from nickname if present
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '')
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname
  const albumSlug = resolvedParams?.albumSlug || ''

  const supabase = createPublicClient()

  // First get the user by nickname
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .single()

  if (profileError || !profile) {
    notFound()
  }

  // Single query for album with photos and moderation data
  const { data: album, error } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      is_public,
      created_at,
      is_suspended,
      suspension_reason,
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
    notFound();
  }
  
  const moderationData = {
    is_suspended: (album as any)?.is_suspended || false,
    suspension_reason: (album as any)?.suspension_reason || null,
  }

  const albumWithPhotos = album as unknown as AlbumWithPhotos

  // Sort photos by sort_order
  const sortedPhotos = [...albumWithPhotos.photos].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  return (
    <>
      <PageContainer>
        {/* Album Header */}
        <div className="mb-8">
          <h1 className="mb-4 text-3xl font-bold">{albumWithPhotos.title}</h1>
          <Link 
            href={albumWithPhotos.profile?.nickname ? `/@${albumWithPhotos.profile.nickname}` : '#'}
            className="mb-4 flex items-center gap-3 w-fit group rounded-lg"
          >
            <Avatar
              avatarUrl={albumWithPhotos.profile?.avatar_url}
              fullName={albumWithPhotos.profile?.full_name}
              hoverEffect
              size="md"
            />
            <div>
              <p className="font-medium group-hover:text-primary transition-colors">
                {albumWithPhotos.profile?.full_name || 'Unknown User'}
              </p>
              <p className="text-sm opacity-70 group-hover:opacity-100 group-hover:text-primary transition-colors">
                {albumWithPhotos.profile?.nickname ? `@${albumWithPhotos.profile.nickname}` : '@unknown'}
              </p>
            </div>
          </Link>
          <p className="mt-2 text-sm opacity-70 mb-4">
            {sortedPhotos.length} {sortedPhotos.length === 1 ? 'photo' : 'photos'}
          </p>
          {albumWithPhotos.description && (
            <p className="text-lg opacity-70">
              {albumWithPhotos.description}
            </p>
          )}
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

        {/* Admin Moderation Panel */}
        <div className="mt-6 md:mt-14">
          <AlbumModerationPanel
            albumId={albumWithPhotos.id}
            albumTitle={albumWithPhotos.title}
            ownerNickname={albumWithPhotos.profile?.nickname || 'unknown'}
            isSuspended={moderationData.is_suspended}
            suspensionReason={moderationData.suspension_reason}
          />
        </div>
      </PageContainer>
      
      <PageContainer variant="alt" className="border-t border-t-border-color">
        <Comments albumId={albumWithPhotos.id} />
      </PageContainer>
    </>
  )
}
