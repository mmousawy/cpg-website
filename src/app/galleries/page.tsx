import { createClient } from '@/utils/supabase/server'
import AlbumCard from '@/components/AlbumCard'
import type { AlbumWithPhotos } from '@/types/albums'

export const metadata = {
  title: 'Photo Galleries - Creative Photography Group',
  description: 'Browse photo albums created by our community members',
}

// Revalidate every 60 seconds to reduce database queries
export const revalidate = 60

export default async function GalleriesPage() {
  const supabase = await createClient()

  // Fetch all public albums with their cover photos and user info
  // Only fetch necessary fields to reduce egress
  const { data: albums, error } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      created_at,
      profile:profiles(full_name, nickname),
      photos:album_photos(id, photo_url)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching albums:', error)
  }

  const albumsWithPhotos = (albums || []) as unknown as AlbumWithPhotos[]

  return (
    <section className="flex justify-center bg-background px-4 pb-8 pt-6 text-foreground sm:p-12 sm:pb-14">
      <div className="w-full max-w-screen-md">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Photo Galleries</h1>
          <p className="text-lg opacity-70">
            Explore beautiful photo albums created by our community members
          </p>
        </div>

        {albumsWithPhotos.length === 0 ? (
          <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
            <p className="text-lg opacity-70">
              No galleries yet. Be the first to create one!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {albumsWithPhotos.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
