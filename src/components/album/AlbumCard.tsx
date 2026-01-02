import Link from 'next/link'
import Image from 'next/image'

import type { AlbumWithPhotos } from '@/types/albums'

import Avatar from '../auth/Avatar'

type AlbumCardProps = {
  album: AlbumWithPhotos
  isOwner?: boolean
}

export default function AlbumCard({ album, isOwner = false }: AlbumCardProps) {
  const coverImage = album.cover_image_url || album.photos?.[0]?.photo_url || '/placeholder-album.jpg'
  const photoCount = album.photos?.length || 0

  const albumUrl = isOwner
    ? `/account/galleries/${album.slug}`
    : `/@${album.profile?.nickname || 'unknown'}/${album.slug}`

  return (
    <Link href={albumUrl} className="group block rounded-lg">
      <div className="group block overflow-hidden rounded-lg border border-border-color bg-background-light transition-shadow group-hover:shadow-lg group-focus:shadow-lg group-hover:border-border-color-strong group-focus:border-border-color-strong">
        <div className="relative aspect-[4/3] overflow-hidden bg-background">
          <Image
            src={coverImage}
            alt={album.title}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105 group-focus:scale-105"
          />
          {photoCount > 0 && (
            <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-3 py-1 text-sm text-white backdrop-blur-md">
              {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
            </div>
          )}
        </div>

        <div className="p-4 pt-3">
          <h3 className="text-md font-semibold line-clamp-1">{album.title}</h3>
          {album.profile && (
            <div className="flex items-center text-sm text-[var(--text-muted)] mt-1">
              <Avatar avatarUrl={album.profile.avatar_url} fullName={album.profile.full_name} size="xxs" className='mr-1.5' />@{album.profile.nickname}
            </div>
          )}
          {!album.is_public && isOwner && (
            <span className="mt-2 inline-block rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
              Private
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
