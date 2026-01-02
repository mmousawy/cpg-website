'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/utils/supabase/client'
import Button from '@/components/shared/Button'
import Container from '@/components/layout/Container'
import PageContainer from '@/components/layout/PageContainer'
import AlbumCard from '@/components/album/AlbumCard'
import type { AlbumWithPhotos } from '@/types/albums'

import PlusSVG from 'public/icons/plus.svg'
import { routes } from '@/config/routes'

export default function AccountGalleriesPage() {
  // User is guaranteed by ProtectedRoute layout
  const { user } = useAuth()
  const supabase = createClient()

  const [albums, setAlbums] = useState<AlbumWithPhotos[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // User is guaranteed by ProtectedRoute layout
    if (!user) return

    if (albums.length === 0) {
      fetchAlbums()
    } else {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchAlbums = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('albums')
        .select(`
          id,
          title,
          description,
          slug,
          cover_image_url,
          is_public,
          created_at,
          photos:album_photos(id, photo_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching albums:', error)
      } else {
        setAlbums((data || []) as unknown as AlbumWithPhotos[])
      }
    } catch (err) {
      console.error('Unexpected error:', err)
    }
    setIsLoading(false)
  }

  return (
    <PageContainer>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold">{routes.accountGalleries.label}</h1>
          <p className="text-lg opacity-70">
            Create and manage your photo albums
          </p>
        </div>
        <Button
          href="/account/galleries/new"
          icon={<PlusSVG className="size-5 -ml-0.5" />}
          variant="primary"
        >
          New Album
        </Button>
      </div>

      {isLoading ? (
        <Container className="text-center animate-pulse">
          <p className="text-foreground/50">Loading your albums...</p>
        </Container>
      ) : albums.length === 0 ? (
        <Container className="text-center">
          <p className="mb-4 text-lg opacity-70">
            You haven&apos;t created any albums yet
          </p>
          <Button href="/account/galleries/new">Create Your First Album</Button>
        </Container>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              isOwner
            />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
