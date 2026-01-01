'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/utils/supabase/client'
import Button from '@/components/shared/Button'
import Container from '@/components/layout/Container'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageContainer from '@/components/layout/PageContainer'
import AlbumCard from '@/components/album/AlbumCard'
import type { AlbumWithPhotos } from '@/types/albums'

import PlusSVG from 'public/icons/plus.svg'

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

  const handleDeleteAlbum = async (albumId: string) => {
    if (!confirm('Are you sure you want to delete this album? All photos will be removed.')) {
      return
    }

    try {
      // Delete all photos first
      const { error: photosError } = await supabase
        .from('album_photos')
        .delete()
        .eq('album_id', albumId)

      if (photosError) {
        console.error('Error deleting photos:', photosError)
        alert('Failed to delete album photos')
        return
      }

      // Delete album
      const { error: albumError } = await supabase
        .from('albums')
        .delete()
        .eq('id', albumId)

      if (albumError) {
        console.error('Error deleting album:', albumError)
        alert('Failed to delete album')
        return
      }

      // Refresh albums list
      fetchAlbums()
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred')
    }
  }

  if (isLoading) {
    return (
      <PageContainer className="items-center justify-center">
        <LoadingSpinner />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">My Galleries</h1>
          <p className="text-lg opacity-70">
            Create and manage your photo albums
          </p>
        </div>
        <Link href="/account/galleries/new">
          <Button>
            <PlusSVG className="size-5 -ml-0.5" />
            New Album
          </Button>
        </Link>
      </div>

      {albums.length === 0 ? (
        <Container className="text-center">
          <p className="mb-4 text-lg opacity-70">
            You haven&apos;t created any albums yet
          </p>
          <Link href="/account/galleries/new">
            <Button>Create Your First Album</Button>
          </Link>
        </Container>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              isOwner
              onDelete={() => handleDeleteAlbum(album.id)}
            />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
