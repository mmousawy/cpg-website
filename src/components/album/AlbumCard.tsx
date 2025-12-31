import Link from 'next/link'
import Image from 'next/image'

import type { AlbumWithPhotos } from '@/types/albums'

import TrashSVG from 'public/icons/trash.svg'

type AlbumCardProps = {
  album: AlbumWithPhotos
  isOwner?: boolean
  onDelete?: () => void
}

export default function AlbumCard({ album, isOwner = false, onDelete }: AlbumCardProps) {
  const coverImage = album.cover_image_url || album.photos?.[0]?.photo_url || '/placeholder-album.jpg'
  const photoCount = album.photos?.length || 0

  const albumUrl = isOwner
    ? `/account/galleries/${album.slug}`
    : `/@${album.profile?.nickname || 'unknown'}/${album.slug}`

  return (
    <div className="group overflow-hidden rounded-lg border border-border-color bg-background-light transition-shadow hover:shadow-lg">
      <Link href={albumUrl} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-background">
          <Image
            src={coverImage}
            alt={album.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {photoCount > 0 && (
            <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-3 py-1 text-sm text-white backdrop-blur-md">
              {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="mb-1 text-lg font-semibold line-clamp-1">{album.title}</h3>
          {album.description && (
            <p className="mb-2 text-sm text-[var(--text-muted)] line-clamp-2">
              {album.description}
            </p>
          )}
          {album.profile && (
            <p className="text-sm text-[var(--text-muted-light)]">
              by {album.profile.full_name || 'Unknown User'}
            </p>
          )}
          {!album.is_public && isOwner && (
            <span className="mt-2 inline-block rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
              Private
            </span>
          )}
        </div>
      </Link>

      {/* Delete button removed. Album deletion is now handled in the warning section on the edit gallery page. */}
    </div>
  )
}
