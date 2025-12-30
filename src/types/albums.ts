import type { Tables } from '@/database.types'

export type Album = Tables<'albums'>
export type AlbumPhoto = Tables<'album_photos'>

export type AlbumWithPhotos = Album & {
  photos: AlbumPhoto[]
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
}
