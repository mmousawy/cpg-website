import PhotoPageContent from '@/components/photo/PhotoPageContent';
import type { Photo } from '@/types/photos';
import { createPublicClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';

type Params = Promise<{
  nickname: string;
  photoId: string;
}>;

export async function generateMetadata({ params }: { params: Params }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const photoId = resolvedParams?.photoId || '';

  if (!nickname || !photoId) {
    return { title: 'Photo Not Found' };
  }

  const supabase = createPublicClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .single();

  if (!profile) {
    return { title: 'Photo Not Found' };
  }

  const { data: photo } = await supabase
    .from('photos')
    .select('title, description')
    .eq('short_id', photoId)
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .is('deleted_at', null)
    .single();

  if (!photo) {
    return { title: 'Photo Not Found' };
  }

  return {
    title: `${photo.title || 'Photo'} by @${nickname}`,
    description: photo.description || `Photo by @${nickname}`,
  };
}

export default async function PhotoPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const photoId = resolvedParams?.photoId || '';

  if (!nickname || !photoId) {
    notFound();
  }

  const supabase = createPublicClient();

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url')
    .eq('nickname', nickname)
    .single();

  if (profileError || !profile || !profile.nickname) {
    notFound();
  }

  // Get photo (must be public for standalone view)
  const { data: photo, error: photoError } = await supabase
    .from('photos')
    .select('*')
    .eq('short_id', photoId)
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .is('deleted_at', null)
    .single();

  if (photoError || !photo) {
    notFound();
  }

  // Get all albums this photo is in (with photo counts)
  const { data: albumPhotos } = await supabase
    .from('album_photos')
    .select('album_id, albums(id, title, slug, cover_image_url, album_photos(count))')
    .eq('photo_id', photo.id)
    .is('albums.deleted_at', null);

  const albums = (albumPhotos || [])
    .map((ap) => {
      const album = ap.albums as any;
      if (!album) return null;
      return {
        id: album.id,
        title: album.title,
        slug: album.slug,
        cover_image_url: album.cover_image_url,
        photo_count: album.album_photos?.[0]?.count ?? 0,
      };
    })
    .filter((a): a is { id: string; title: string; slug: string; cover_image_url: string | null; photo_count: number } => a !== null);

  return (
    <PhotoPageContent
      photo={photo as Photo}
      profile={{
        id: profile.id,
        full_name: profile.full_name,
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
      }}
      albums={albums}
    />
  );
}
