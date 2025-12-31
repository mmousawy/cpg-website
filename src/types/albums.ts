import type { Tables } from '@/database.types'

export type Album = Tables<'albums'>
export type AlbumPhoto = Tables<'album_photos'>
export type AlbumTag = Tables<'album_tags'>

export type AlbumWithPhotos = Album & {
  photos: AlbumPhoto[]
  tags?: AlbumTag[]
  profile?: {
    full_name: string | null
    avatar_url: string | null
    nickname: string | null
  }
}

export type AlbumFormData = {
  title: string
  slug: string
  description: string
  is_public: boolean
  tags?: string[]
}
