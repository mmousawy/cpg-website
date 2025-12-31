import Link from 'next/link'
import Image from 'next/image'

import type { AlbumWithPhotos } from '@/types/albums'

import Avatar from '../auth/Avatar'

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
          {album.profile && (
            <div className="flex items-center text-sm text-[var(--text-muted-light)]">
              <Avatar avatarUrl={album.profile.avatar_url} fullName={album.profile.full_name} size="sm" className='!size-6 mr-2' />@{album.profile.nickname}
            </div>
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
