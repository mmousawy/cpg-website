'use client'

import { useState, useEffect, useRef } from 'react'
import exifr from 'exifr'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import clsx from 'clsx'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useAuth } from '@/hooks/useAuth'
import { useFormChanges } from '@/hooks/useFormChanges'
import { createClient } from '@/utils/supabase/client'
import Button from '@/components/shared/Button'
import Container from '@/components/layout/Container'
import PageContainer from '@/components/layout/PageContainer'
import StickyActionBar from '@/components/shared/StickyActionBar'
import type { Album, AlbumPhoto } from '@/types/albums'
import { revalidateAlbum } from '@/app/actions/revalidate'

import TrashSVG from 'public/icons/trash.svg'
import EditSVG from 'public/icons/edit.svg'
import PlusSVG from 'public/icons/plus.svg'
import CloseSVG from 'public/icons/close.svg'
import ErrorMessage from '@/components/shared/ErrorMessage'
import SuccessMessage from '@/components/shared/SuccessMessage'

// Zod schema for album form validation
const albumFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  isPublic: z.boolean(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed'),
})

type AlbumFormData = z.infer<typeof albumFormSchema>

// Expand/zoom icon component
function ExpandSVG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  )
}

// Shared input styling
const inputClassName = "rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"

// Empty state component for photos section
function EmptyPhotosState() {
  return (
    <div className="rounded-lg border-2 border-dashed border-border-color p-12 text-center">
      <p className="opacity-70">
        No photos yet. Add some photos to your album!
      </p>
    </div>
  )
}

interface SortablePhotoProps {
  photo: AlbumPhoto
  onDelete: (photoId: string, photoUrl: string) => void
  onEditCaption: (photoId: string, currentTitle: string | null) => void
  isEditing: boolean
  editingCaption: string
  onCaptionChange: (value: string) => void
  onSaveCaption: () => void
  onCancelEdit: () => void
}

interface SortablePendingPhotoProps {
  file: File
  index: number
  onDelete: (index: number) => void
}

function SortablePendingPhoto({ file, index, onDelete }: SortablePendingPhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `pending-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group relative overflow-hidden rounded-lg border border-border-color bg-background',
        isDragging && 'z-50'
      )}
    >
      <div className="aspect-square overflow-hidden" {...attributes} {...listeners}>
        <img
          src={URL.createObjectURL(file)}
          alt={file.name}
          className="size-full cursor-move object-cover"
        />
      </div>
      <div className="p-2">
        <div className="flex items-start justify-between gap-2">
          <p className="flex-1 text-sm text-foreground/70 truncate">
            {file.name}
          </p>
          <button
            onClick={() => onDelete(index)}
            className="rounded p-1 hover:bg-red-600/10"
            aria-label="Remove photo"
          >
            <TrashSVG className="size-4 text-red-600" />
          </button>
        </div>
      </div>
    </div>
  )
}

function SortablePhoto({
  photo,
  onDelete,
  onEditCaption,
  isEditing,
  editingCaption,
  onCaptionChange,
  onSaveCaption,
  onCancelEdit,
}: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group relative overflow-hidden rounded-lg border border-border-color bg-background',
        isDragging && 'z-50'
      )}
    >
      <div className="aspect-square overflow-hidden relative">
        <div className="size-full" {...attributes} {...listeners}>
          <Image
            src={photo.photo_url}
            alt={photo.title || ''}
            width={300}
            height={300}
            className="size-full cursor-move object-cover"
          />
        </div>
        {/* Zoom button - PhotoSwipe anchor */}
        <a
          href={photo.photo_url}
          data-pswp-width={photo.width || 1200}
          data-pswp-height={photo.height || 800}
          target="_blank"
          rel="noreferrer"
          className="absolute right-2 top-2 rounded-md bg-black/50 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
          aria-label="View fullscreen"
          onClick={(e) => e.stopPropagation()}
        >
          <ExpandSVG className="size-4" />
        </a>
      </div>

      {/* Caption section */}
      <div className="p-2">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editingCaption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Add a caption..."
              className="w-full rounded border border-border-color bg-background px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                onClick={onSaveCaption}
                size="sm"
              >
                Save
              </Button>
              <Button
                onClick={onCancelEdit}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <p className="flex-1 text-sm text-foreground/70">
              {photo.title || 'No caption'}
            </p>
            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => onEditCaption(photo.id, photo.title)}
                className="rounded p-1 hover:bg-background-alt"
                aria-label="Edit caption"
              >
                <EditSVG className="size-4 text-foreground/70" />
              </button>
              <button
                onClick={() => onDelete(photo.id, photo.photo_url)}
                className="rounded p-1 hover:bg-red-600/10"
                aria-label="Delete photo"
              >
                <TrashSVG className="size-4 text-red-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AlbumDetailPage() {
  // User is guaranteed by ProtectedRoute layout
  const { user } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const albumSlug = params.albumSlug as string
  const isNewAlbum = albumSlug === 'new'

  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<AlbumPhoto[]>([])
  const [savedPhotos, setSavedPhotos] = useState<AlbumPhoto[]>([]) // Baseline for dirty tracking
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])
  const [profile, setProfile] = useState<{ nickname: string | null } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null)
  const [editingCaption, setEditingCaption] = useState('')
  const [tagInput, setTagInput] = useState('')

  // Saved form values for dirty tracking
  const [savedFormValues, setSavedFormValues] = useState<AlbumFormData | null>(null)

  // Form defaults
  const formDefaultValues: AlbumFormData = {
    title: '',
    slug: '',
    description: '',
    isPublic: true,
    tags: [],
  }

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AlbumFormData>({
    resolver: zodResolver(albumFormSchema),
    defaultValues: formDefaultValues,
  })

  // Watch form values for dirty tracking
  const currentValues = watch()
  const watchedSlug = watch('slug')
  const watchedTags = watch('tags')

  // Track if photos have changed (for existing albums)
  const photosChanged = !isNewAlbum && JSON.stringify(photos.map(p => p.id)) !== JSON.stringify(savedPhotos.map(p => p.id))
  const hasPendingPhotos = pendingPhotos.length > 0

  // Use custom dirty tracking
  const { hasChanges, changeCount } = useFormChanges(currentValues, savedFormValues, {}, photosChanged, hasPendingPhotos)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    // User is guaranteed by ProtectedRoute layout
    if (!user) return

    fetchProfile()
    if (!isNewAlbum) {
      // Only fetch album if not already loaded
      if (!album || album.slug !== albumSlug) {
        fetchAlbum()
      } else {
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, albumSlug])

  // Initialize PhotoSwipe lightbox for the photos grid
  useEffect(() => {
    let lightbox: PhotoSwipeLightbox | null = new PhotoSwipeLightbox({
      gallery: '#edit-album-gallery',
      children: 'a',
      pswpModule: () => import('photoswipe'),
    })

    lightbox.init()

    return () => {
      lightbox?.destroy()
      lightbox = null
    }
  }, [photos])

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }

  const fetchAlbum = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select('id, title, slug, description, is_public, cover_image_url, created_at, updated_at, user_id')
        .eq('slug', albumSlug)
        .eq('user_id', user.id)
        .single()

      if (albumError) {
        console.error('Error fetching album:', albumError)
        setSubmitError('Album not found')
        setIsLoading(false)
        return
      }

      setAlbum(albumData as Album)

      // Fetch tags
      const { data: tagsData } = await supabase
        .from('album_tags')
        .select('tag')
        .eq('album_id', albumData.id)

      const albumTags = tagsData?.map(t => t.tag) || []

      // Set form values
      const formValues: AlbumFormData = {
        title: albumData.title,
        slug: albumData.slug,
        description: albumData.description || '',
        isPublic: albumData.is_public,
        tags: albumTags,
      }
      reset(formValues)
      setSavedFormValues(formValues)

      // Fetch photos - only necessary fields
      const { data: photosData, error: photosError } = await supabase
        .from('album_photos')
        .select('id, album_id, photo_url, title, width, height, sort_order')
        .eq('album_id', albumData.id)
        .order('sort_order', { ascending: true })

      if (photosError) {
        console.error('Error fetching photos:', photosError)
      } else {
        setPhotos(photosData as AlbumPhoto[])
        setSavedPhotos(photosData as AlbumPhoto[])
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setSubmitError('An unexpected error occurred')
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
    setValue('title', value, { shouldDirty: true })
    // Always auto-generate slug from title for new albums
    if (isNewAlbum) {
      setValue('slug', generateSlug(value), { shouldDirty: true })
    }
  }

  const onSubmit = async (data: AlbumFormData) => {
    if (!user) return

    setIsSaving(true)
    setSubmitError(null)
    setSuccess(false)

    try {
      if (isNewAlbum) {
        // Create new album
        const { data: newAlbum, error: createError } = await supabase
          .from('albums')
          .insert({
            user_id: user.id,
            title: data.title.trim(),
            slug: data.slug.trim(),
            description: data.description?.trim() || null,
            is_public: data.isPublic,
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating album:', createError)
          setSubmitError(createError.message || 'Failed to create album')
          setIsSaving(false)
          return
        }

        // Add tags for new album
        if (data.tags.length > 0 && newAlbum) {
          const { error: tagsError } = await supabase
            .from('album_tags')
            .insert(data.tags.map(tag => ({
              album_id: newAlbum.id,
              tag: tag.toLowerCase()
            })))

          if (tagsError) {
            console.error('Error saving tags:', tagsError)
            // Don't fail the whole operation, just log the error
          }
        }

        // Upload pending photos for new album
        if (pendingPhotos.length > 0 && newAlbum) {

          const uploadPromises = pendingPhotos.map(async (file, index) => {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            if (!allowedTypes.includes(file.type)) {
              throw new Error(`Invalid file type: ${file.name}`)
            }

            // Validate file size (max 5 MB)
            const maxSize = 5 * 1024 * 1024
            if (file.size > maxSize) {
              throw new Error(`File too large: ${file.name}`)
            }

            // Generate random filename
            const fileExt = file.name.split('.').pop()
            const randomId = crypto.randomUUID()
            const fileName = `${randomId}.${fileExt}`
            const filePath = `${user.id}/${newAlbum.id}/${fileName}`

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

            // Extract EXIF data
            let exifData = null
            try {
              exifData = await exifr.parse(file, {
                pick: ['Make', 'Model', 'DateTimeOriginal', 'ExposureTime', 'FNumber', 'ISO', 'FocalLength', 'LensModel', 'GPSLatitude', 'GPSLongitude']
              })
            } catch (err) {
              console.warn('Failed to extract EXIF data:', err)
            }

            // Insert image metadata first (album_photos has FK to images)
            await supabase
              .from('images')
              .insert({
                storage_path: filePath,
                url: publicUrl,
                width: img.width,
                height: img.height,
                file_size: file.size,
                mime_type: file.type,
                exif_data: exifData,
                uploaded_by: user.id,
              })

            // Insert photo record
            await supabase
              .from('album_photos')
              .insert({
                album_id: newAlbum.id,
                photo_url: publicUrl,
                width: img.width,
                height: img.height,
                sort_order: index,
              })

            return publicUrl
          })

          const uploadedUrls = await Promise.all(uploadPromises)

          // Set first photo as cover image
          if (uploadedUrls.length > 0) {
            await supabase
              .from('albums')
              .update({ cover_image_url: uploadedUrls[0] })
              .eq('id', newAlbum.id)
          }
        }

        // Revalidate album pages
        if (profile?.nickname) {
          await revalidateAlbum(profile.nickname, data.slug)
        }

        setSuccess(true)
        setTimeout(() => {
          router.push(`/account/galleries/${data.slug}`)
        }, 1000)
      } else {
        // Update existing album with cover image in single request
        const { error: updateError } = await supabase
          .from('albums')
          .update({
            title: data.title.trim(),
            slug: data.slug.trim(),
            description: data.description?.trim() || null,
            is_public: data.isPublic,
            cover_image_url: photos.length > 0 ? photos[0].photo_url : album!.cover_image_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', album!.id)

        if (updateError) {
          console.error('Error updating album:', updateError)
          setSubmitError(updateError.message || 'Failed to update album')
          setIsSaving(false)
          return
        }

        // Update tags: delete all and upsert new ones
        await supabase
          .from('album_tags')
          .delete()
          .eq('album_id', album!.id)

        if (data.tags.length > 0) {
          await supabase
            .from('album_tags')
            .insert(data.tags.map(tag => ({
              album_id: album!.id,
              tag: tag.toLowerCase()
            })))
        }

        // Update photo sort order in batch
        if (photos.length > 0) {
          const updates = photos.map((photo, index) => ({
            id: photo.id,
            album_id: photo.album_id,
            photo_url: photo.photo_url,
            width: photo.width,
            height: photo.height,
            title: photo.title,
            sort_order: index
          }))

          await supabase
            .from('album_photos')
            .upsert(updates, { onConflict: 'id' })
        }

        // Create clean saved data and reset form to match
        const savedData: AlbumFormData = {
          title: data.title.trim(),
          slug: data.slug.trim(),
          description: data.description?.trim() || '',
          isPublic: data.isPublic,
          tags: data.tags,
        }
        reset(savedData)
        setSavedFormValues(savedData)
        setSavedPhotos([...photos])

        // Revalidate album pages
        if (profile?.nickname) {
          await revalidateAlbum(profile.nickname, data.slug)
        }

        setSuccess(true)
        if (data.slug !== albumSlug) {
          setTimeout(() => {
            router.push(`/account/galleries/${data.slug}`)
          }, 1000)
        } else {
          setTimeout(() => setSuccess(false), 3000)
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setSubmitError('An unexpected error occurred')
    }

    setIsSaving(false)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !user) return

    // For new albums, just store the files to upload later
    if (isNewAlbum) {
      const newFiles = Array.from(files)
      setPendingPhotos([...pendingPhotos, ...newFiles])
      return
    }

    // For existing albums, upload immediately
    if (!album) return

    setIsUploading(true)
    setSubmitError(null)

    try {

      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`Invalid file type: ${file.name}`)
        }

        // Validate file size (max 5 MB)
        const maxSize = 5 * 1024 * 1024
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

        // Extract EXIF data
        let exifData = null
        try {
          exifData = await exifr.parse(file, {
            pick: ['Make', 'Model', 'DateTimeOriginal', 'ExposureTime', 'FNumber', 'ISO', 'FocalLength', 'LensModel', 'GPSLatitude', 'GPSLongitude']
          })
        } catch (err) {
          console.warn('Failed to extract EXIF data:', err)
        }

        // Insert image metadata first (album_photos has FK to images)
        await supabase
          .from('images')
          .insert({
            storage_path: filePath,
            url: publicUrl,
            width: img.width,
            height: img.height,
            file_size: file.size,
            mime_type: file.type,
            exif_data: exifData,
            uploaded_by: user.id,
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
      setSubmitError(err.message || 'Failed to upload photos')
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = photos.findIndex((p) => p.id === active.id)
    const newIndex = photos.findIndex((p) => p.id === over.id)

    const newPhotos = arrayMove(photos, oldIndex, newIndex)

    // Update local state only - will save to database when "Save Changes" is clicked
    setPhotos(newPhotos)
  }

  const handlePendingPhotosDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const activeIndex = parseInt(String(active.id).replace('pending-', ''))
    const overIndex = parseInt(String(over.id).replace('pending-', ''))

    const newPendingPhotos = arrayMove(pendingPhotos, activeIndex, overIndex)
    setPendingPhotos(newPendingPhotos)
  }

  const handleEditCaption = (photoId: string, currentTitle: string | null) => {
    setEditingPhotoId(photoId)
    setEditingCaption(currentTitle || '')
  }

  const handleSaveCaption = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from('album_photos')
        .update({ title: editingCaption || null })
        .eq('id', photoId)

      if (error) throw error

      // Update local state
      setPhotos(photos.map(p =>
        p.id === photoId ? { ...p, title: editingCaption || null } : p
      ))

      setEditingPhotoId(null)
      setEditingCaption('')
    } catch (err) {
      console.error('Error saving caption:', err)
      alert('Failed to save caption')
    }
  }

  const handleCancelEdit = () => {
    setEditingPhotoId(null)
    setEditingCaption('')
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const newTag = tagInput.trim().toLowerCase()
      const currentTags = watchedTags || []

      if (currentTags.length < 5 && !currentTags.includes(newTag)) {
        setValue('tags', [...currentTags, newTag], { shouldDirty: true })
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = watchedTags || []
    setValue('tags', currentTags.filter(tag => tag !== tagToRemove), { shouldDirty: true })
  }

  const handleRemovePendingPhoto = (index: number) => {
    setPendingPhotos(pendingPhotos.filter((_, i) => i !== index))
  }

  const handleAddPhotosClick = () => {
    fileInputRef.current?.click()
  }

  const handleDeleteAlbum = async () => {
    if (!album) return
    if (!confirm('Are you sure you want to delete this album? This action cannot be undone and will remove all photos.')) {
      return
    }

    setIsDeleting(true)
    setSubmitError(null)

    try {
      // Delete all photos first
      await supabase.from('album_photos').delete().eq('album_id', album.id)
      // Delete all tags
      await supabase.from('album_tags').delete().eq('album_id', album.id)
      // Delete the album
      const { error: deleteError } = await supabase.from('albums').delete().eq('id', album.id)

      if (deleteError) {
        setSubmitError(deleteError.message || 'Failed to delete album')
        setIsDeleting(false)
        return
      }

      // Revalidate album pages
      if (profile?.nickname) {
        await revalidateAlbum(profile.nickname, album.slug)
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/account/galleries')
      }, 1500)
    } catch (err) {
      console.error('Error deleting album:', err)
      setSubmitError('An unexpected error occurred')
      setIsDeleting(false)
    }
  }

  return (
    <>
    <PageContainer>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">
          {isNewAlbum ? 'Create new album' : 'Edit album'}
        </h1>
        <p className="text-lg opacity-70">
          {isNewAlbum
            ? 'Create a new photo album to share with the community'
            : 'Manage your album details and photos'}
        </p>
      </div>

      {isLoading ? (
        <Container className="text-center animate-pulse">
          <p className="text-foreground/50">Loading album...</p>
        </Container>
      ) : (
      <div className="space-y-6">
        {/* Photos Section */}
        <Container>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Photos ({isNewAlbum ? pendingPhotos.length : photos.length})
            </h2>
            <Button
              onClick={handleAddPhotosClick}
              disabled={isUploading}
              icon={<PlusSVG className="size-4" />}
            >
              {isUploading ? 'Uploading...' : 'Add photos'}
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

          {isNewAlbum ? (
            // Show pending photos for new albums
            pendingPhotos.length === 0 ? (
              <EmptyPhotosState />
            ) : (
              <>
                <p className="mb-4 text-sm text-foreground/70">
                  Drag photos to reorder them. Photos will be uploaded when you create the album.
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handlePendingPhotosDragEnd}
                >
                  <SortableContext
                    items={pendingPhotos.map((_, i) => `pending-${i}`)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {pendingPhotos.map((file, index) => (
                        <SortablePendingPhoto
                          key={`pending-${index}`}
                          file={file}
                          index={index}
                          onDelete={handleRemovePendingPhoto}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </>
            )
          ) : (
            // Show uploaded photos for existing albums
            photos.length === 0 ? (
              <EmptyPhotosState />
            ) : (
              <>
                <p className="mb-4 text-sm text-foreground/70">
                  Drag photos to reorder them
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={photos.map(p => p.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div id="edit-album-gallery" className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {photos.map((photo) => (
                        <SortablePhoto
                          key={photo.id}
                          photo={photo}
                          onDelete={handleDeletePhoto}
                          onEditCaption={handleEditCaption}
                          isEditing={editingPhotoId === photo.id}
                          editingCaption={editingCaption}
                          onCaptionChange={setEditingCaption}
                          onSaveCaption={() => handleSaveCaption(photo.id)}
                          onCancelEdit={handleCancelEdit}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </>
            )
          )}
        </Container>
        
        {/* Album Details Form */}
        <Container>
          <form id="album-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title *
              </label>
              <input
                id="title"
                type="text"
                {...register('title')}
                onChange={(e) => handleTitleChange(e.target.value)}
                className={clsx(inputClassName, errors.title && 'border-red-500')}
                placeholder="My Amazing Photo Album"
              />
              {errors.title && (
                <p className="text-xs text-red-500">{errors.title.message}</p>
              )}
              <p className="text-xs text-foreground/50">
                URL: {process.env.NEXT_PUBLIC_SITE_URL}/@{profile?.nickname || 'your-nickname'}/{watchedSlug || 'your-title'}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                {...register('description')}
                rows={4}
                className={inputClassName}
                placeholder="Tell us about this album..."
              />
            </div>

            <div className="flex items-center">
              <input
                id="isPublic"
                type="checkbox"
                {...register('isPublic')}
                className="size-4 rounded border-neutral-300 text-blue-600"
              />
              <label htmlFor="isPublic" className="ml-2 text-sm">
                Make this album public (visible to everyone)
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="tags" className="text-sm font-medium">
                Tags
              </label>
              {watchedTags && watchedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {watchedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-3 py-1 text-sm font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="rounded-full bg-background-light/70 hover:bg-background-light font-bold text-foreground size-5 flex items-center justify-center -mr-2 ml-1"
                        aria-label="Remove tag"
                      >
                        <CloseSVG
                          className="size-3.5"
                        />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {errors.tags && (
                <p className="text-xs text-red-500">{errors.tags.message}</p>
              )}
              <input
                id="tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                disabled={(watchedTags?.length || 0) >= 5}
                onKeyDown={handleAddTag}
                className={`${inputClassName} disabled:opacity-50`}
                placeholder={(watchedTags?.length || 0) >= 5 ? 'Maximum of 5 tags reached' : 'Type a tag and press Enter to add'}
              />
              <p className="text-xs text-foreground/50">
                Add up to 5 tags to help people discover your album
              </p>
            </div>
          </form>
        </Container>



        {/* Danger zone: Album deletion warning section */}
        {!isNewAlbum && album && (
          <Container className="border-red-500/30 bg-red-500/5">
            <h3 className="mb-2 font-semibold text-red-600">Danger zone</h3>
            <p className="mb-4 text-sm text-foreground/70">
              Once you delete an album, there is no going back. This will permanently delete the album and all associated photos and tags.
            </p>
            <Button
              onClick={handleDeleteAlbum}
              variant="danger"
              icon={<TrashSVG className="h-4 w-4" />}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete album'}
            </Button>
          </Container>
        )}

      </div>
      )}
    </PageContainer>

    {/* Sticky Action Bar - outside PageContainer */}
    {!isLoading && (
      <StickyActionBar>
        <div className="flex items-center gap-2 text-sm">
          {submitError && (
            <span className="text-red-500">{submitError}</span>
          )}
          {success && (
            <span className="text-green-500">Album saved successfully!</span>
          )}
          {!submitError && !success && hasChanges && (
            <span className="text-foreground/70">
              {changeCount} unsaved {changeCount === 1 ? 'change' : 'changes'}
            </span>
          )}
        </div>
        <Button
          type="submit"
          form="album-form"
          disabled={isSaving || (!isNewAlbum && !hasChanges)}
          loading={isSaving}
        >
          {isNewAlbum ? 'Create Album' : 'Save changes'}
        </Button>
      </StickyActionBar>
    )}
    </>
  )
}
