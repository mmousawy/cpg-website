'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import clsx from 'clsx'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/utils/supabase/client'
import Button from '@/components/Button'
import Container from '@/components/Container'
import LoadingSpinner from '@/components/LoadingSpinner'
import PageContainer from '@/components/PageContainer'
import type { Album, AlbumPhoto } from '@/types/albums'

import CheckSVG from 'public/icons/check.svg'
import TrashSVG from 'public/icons/trash.svg'

export default function AlbumDetailPage() {
  const { user, isLoading: authLoading } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const albumSlug = params.albumSlug as string
  const isNewAlbum = albumSlug === 'new'

  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<AlbumPhoto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user && !isNewAlbum) {
      fetchAlbum()
    } else if (user && isNewAlbum) {
      setIsLoading(false)
    }
  }, [user, authLoading, albumSlug, router])

  const fetchAlbum = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select('*')
        .eq('slug', albumSlug)
        .eq('user_id', user.id)
        .single()

      if (albumError) {
        console.error('Error fetching album:', albumError)
        setError('Album not found')
        setIsLoading(false)
        return
      }

      setAlbum(albumData as Album)
      setTitle(albumData.title)
      setSlug(albumData.slug)
      setDescription(albumData.description || '')
      setIsPublic(albumData.is_public)

      // Fetch photos
      const { data: photosData, error: photosError } = await supabase
        .from('album_photos')
        .select('*')
        .eq('album_id', albumData.id)
        .order('sort_order', { ascending: true })

      if (photosError) {
        console.error('Error fetching photos:', photosError)
      } else {
        setPhotos(photosData as AlbumPhoto[])
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    }
    setIsLoading(false)
  }

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    // Always auto-generate slug from title for new albums
    if (isNewAlbum) {
      setSlug(generateSlug(value))
    }
  }

  const handleSave = async () => {
    if (!user) return

    if (!title.trim() || !slug.trim()) {
      setError('Title and slug are required')
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      if (isNewAlbum) {
        // Create new album
        const { data: newAlbum, error: createError } = await supabase
          .from('albums')
          .insert({
            user_id: user.id,
            title: title.trim(),
            slug: slug.trim(),
            description: description.trim() || null,
            is_public: isPublic,
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating album:', createError)
          setError(createError.message || 'Failed to create album')
          setIsSaving(false)
          return
        }

        setSuccess(true)
        setTimeout(() => {
          router.push(`/account/galleries/${slug}`)
        }, 1000)
      } else {
        // Update existing album
        const { error: updateError } = await supabase
          .from('albums')
          .update({
            title: title.trim(),
            slug: slug.trim(),
            description: description.trim() || null,
            is_public: isPublic,
            updated_at: new Date().toISOString(),
          })
          .eq('id', album!.id)

        if (updateError) {
          console.error('Error updating album:', updateError)
          setError(updateError.message || 'Failed to update album')
          setIsSaving(false)
          return
        }

        setSuccess(true)
        if (slug !== albumSlug) {
          setTimeout(() => {
            router.push(`/account/galleries/${slug}`)
          }, 1000)
        } else {
          setTimeout(() => setSuccess(false), 3000)
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    }

    setIsSaving(false)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !user || !album) return

    setIsUploading(true)
    setError(null)

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`Invalid file type: ${file.name}`)
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024
        if (file.size > maxSize) {
          throw new Error(`File too large: ${file.name}`)
        }

        // Generate random filename
        const fileExt = file.name.split('.').pop()
        const randomId = crypto.randomUUID()
        const fileName = `${randomId}.${fileExt}`
        const filePath = `${user.id}/${album.id}/${fileName}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('user-albums')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          throw new Error(`Upload failed: ${file.name}`)
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('user-albums')
          .getPublicUrl(filePath)

        // Get image dimensions
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new window.Image()
          image.onload = () => resolve(image)
          image.onerror = reject
          image.src = URL.createObjectURL(file)
        })

        // Insert photo record
        const { data: photoData, error: insertError } = await supabase
          .from('album_photos')
          .insert({
            album_id: album.id,
            photo_url: publicUrl,
            width: img.width,
            height: img.height,
            sort_order: photos.length,
          })
          .select()
          .single()

        if (insertError) {
          throw new Error(`Failed to save photo: ${file.name}`)
        }

        return photoData as AlbumPhoto
      })

      const newPhotos = await Promise.all(uploadPromises)
      setPhotos([...photos, ...newPhotos])

      // Update cover image if this is the first photo
      if (photos.length === 0 && newPhotos.length > 0) {
        await supabase
          .from('albums')
          .update({ cover_image_url: newPhotos[0].photo_url })
          .eq('id', album.id)
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload photos')
    }

    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return
    }

    try {
      // Delete from database
      const { error: deleteError } = await supabase
        .from('album_photos')
        .delete()
        .eq('id', photoId)

      if (deleteError) {
        console.error('Error deleting photo:', deleteError)
        alert('Failed to delete photo')
        return
      }

      // Update local state
      setPhotos(photos.filter((p) => p.id !== photoId))

      // Update cover image if needed
      if (album?.cover_image_url === photoUrl) {
        const remainingPhotos = photos.filter((p) => p.id !== photoId)
        await supabase
          .from('albums')
          .update({
            cover_image_url: remainingPhotos.length > 0 ? remainingPhotos[0].photo_url : null
          })
          .eq('id', album.id)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred')
    }
  }

  if (authLoading || isLoading) {
    return (
      <PageContainer className="items-center justify-center">
        <div className="flex justify-center">
          <LoadingSpinner />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="mb-1 text-3xl font-bold">
          {isNewAlbum ? 'Create new album' : 'Edit album'}
        </h1>
        <p className="opacity-70">
          {isNewAlbum
            ? 'Create a new photo album to share with the community'
            : 'Manage your album details and photos'}
        </p>
      </div>

      <div className="space-y-6">
        {/* Album Details Form */}
        <Container>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
                placeholder="My Amazing Photo Album"
              />
              <p className="text-xs text-foreground/50">
                URL: /galleries/{user?.user_metadata?.nickname || 'your-nickname'}/{slug || 'your-slug'}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
                placeholder="Tell us about this album..."
              />
            </div>

            <div className="flex items-center">
              <input
                id="isPublic"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="size-4 rounded border-neutral-300 text-blue-600"
              />
              <label htmlFor="isPublic" className="ml-2 text-sm">
                Make this album public (visible to everyone)
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-500">
              <CheckSVG className="size-4" />
              Album saved successfully!
            </div>
          )}

          <div className="mt-6">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : isNewAlbum ? 'Create Album' : 'Save Changes'}
            </Button>
          </div>
        </Container>

        {/* Photos Section - Only show for existing albums */}
        {!isNewAlbum && album && (
          <Container>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Photos ({photos.length})</h2>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Add Photos'}
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {photos.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-border-color p-12 text-center">
                <p className="opacity-70">
                  No photos yet. Add some photos to your album!
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg">
                    <Image
                      src={photo.photo_url}
                      alt={photo.title || ''}
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={() => handleDeletePhoto(photo.id, photo.photo_url)}
                      className="absolute right-2 top-2 rounded-full bg-red-600 p-2 opacity-0 transition-opacity hover:bg-red-700 group-hover:opacity-100"
                      aria-label="Delete photo"
                    >
                      <TrashSVG className="size-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Container>
        )}
      </div>
    </PageContainer>
  )
}
