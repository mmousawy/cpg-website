import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/server'
import AlbumGallery from '@/components/AlbumGallery'
import type { AlbumWithPhotos } from '@/types/albums'

export async function generateMetadata({ params }: { params: Promise<{ nickname: string; albumSlug: string }> }) {
  const { nickname, albumSlug } = await params
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
  const { nickname, albumSlug } = await params
  const supabase = await createClient()

  // First get the user by nickname
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .single()

  if (profileError || !profile) {
    notFound()
  }

  // Fetch album with photos and user info
  const { data: album, error } = await supabase
    .from('albums')
    .select(`
      *,
      profile:profiles(full_name, avatar_url, nickname),
      photos:album_photos(*)
    `)
    .eq('user_id', profile.id)
    .eq('slug', albumSlug)
    .eq('is_public', true)
    .single()

  if (error || !album) {
    notFound()
  }

  const albumWithPhotos = album as unknown as AlbumWithPhotos

  // Sort photos by sort_order
  const sortedPhotos = [...albumWithPhotos.photos].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <section className="flex justify-center bg-background px-4 pb-8 pt-6 text-foreground sm:p-12 sm:pb-14">
      <div className="w-full max-w-screen-md">
        {/* Album Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative size-12 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              {albumWithPhotos.profile?.avatar_url ? (
                <Image
                  src={albumWithPhotos.profile.avatar_url}
                  alt={albumWithPhotos.profile.full_name || 'User'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-sm font-bold text-neutral-600 dark:text-neutral-400">
                  {albumWithPhotos.profile?.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm opacity-70">
                Created by
              </p>
              <p className="font-medium">
                {albumWithPhotos.profile?.full_name || 'Unknown User'}
              </p>
            </div>
          </div>

          <h1 className="mb-3 text-4xl font-bold">{albumWithPhotos.title}</h1>
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
          <AlbumGallery photos={sortedPhotos} />
        )}
      </div>
    </section>
  )
}
