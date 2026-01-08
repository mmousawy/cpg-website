import PhotoPageContent from '@/components/photo/PhotoPageContent';
import type { Photo } from '@/types/photos';
import { createPublicClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';

type Params = Promise<{
  nickname: string;
  albumSlug: string;
  photoId: string;
}>;

export async function generateMetadata({ params }: { params: Params }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const albumSlug = resolvedParams?.albumSlug || '';
  const photoId = resolvedParams?.photoId || '';

  if (!nickname || !albumSlug || !photoId) {
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

  const { data: album } = await supabase
    .from('albums')
    .select('title')
    .eq('user_id', profile.id)
    .eq('slug', albumSlug)
    .eq('is_public', true)
    .single();

  const { data: photo } = await supabase
    .from('photos')
    .select('title')
    .eq('short_id', photoId)
    .single();

  if (!album || !photo) {
    return { title: 'Photo Not Found' };
  }

  return {
    title: `${photo.title || 'Photo'} - ${album.title} by @${nickname}`,
    description: `Photo from album "${album.title}" by @${nickname}`,
  };
}

export default async function AlbumPhotoPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const albumSlug = resolvedParams?.albumSlug || '';
  const photoId = resolvedParams?.photoId || '';

  if (!nickname || !albumSlug || !photoId) {
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

  // Get album
  const { data: album, error: albumError } = await supabase
    .from('albums')
    .select('id, title, slug, description, cover_image_url')
    .eq('user_id', profile.id)
    .eq('slug', albumSlug)
    .eq('is_public', true)
    .single();

  if (albumError || !album) {
    notFound();
  }

  // Get photo (don't require is_public since it's part of a public album)
  const { data: photo, error: photoError } = await supabase
    .from('photos')
    .select('*')
    .eq('short_id', photoId)
    .single();

  if (photoError || !photo) {
    notFound();
  }

  // Verify photo is part of this album
  const { data: albumPhoto } = await supabase
    .from('album_photos')
    .select('id')
    .eq('album_id', album.id)
    .eq('photo_id', photo.id)
    .single();

  if (!albumPhoto) {
    notFound();
  }

  // Get all albums this photo is in
  const { data: albumPhotos } = await supabase
    .from('album_photos')
    .select('album_id, albums(id, title, slug, cover_image_url)')
    .eq('photo_id', photo.id);

  const albums = (albumPhotos || [])
    .map((ap) => ap.albums)
    .filter((a): a is { id: string; title: string; slug: string; cover_image_url: string | null } => a !== null);

  return (
    <PhotoPageContent
      photo={photo as Photo}
      profile={{
        id: profile.id,
        full_name: profile.full_name,
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
      }}
      currentAlbum={album}
      albums={albums}
    />
  );
}
