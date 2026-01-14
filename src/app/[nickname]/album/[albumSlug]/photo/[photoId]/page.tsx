import { cacheLife, cacheTag } from 'next/cache';
import PhotoPageContent from '@/components/photo/PhotoPageContent';
import { getAlbumPhotoByShortId } from '@/lib/data/profiles';
import { notFound } from 'next/navigation';

type Params = Promise<{
  nickname: string;
  albumSlug: string;
  photoId: string;
}>;

// Provide sample params for build-time validation
export async function generateStaticParams() {
  return [{ nickname: 'sample', albumSlug: 'sample', photoId: 'sample' }];
}

export async function generateMetadata({ params }: { params: Params }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const albumSlug = resolvedParams?.albumSlug || '';
  const photoId = resolvedParams?.photoId || '';

  if (!nickname || !albumSlug || !photoId) {
    return { title: 'Photo Not Found' };
  }

  // Use cached function
  const result = await getAlbumPhotoByShortId(nickname, albumSlug, photoId);

  if (!result) {
    return { title: 'Photo Not Found' };
  }

  return {
    title: `${result.photo.title || 'Photo'} - ${result.currentAlbum.title} by @${nickname}`,
    description: `Photo from album "${result.currentAlbum.title}" by @${nickname}`,
  };
}

export default async function AlbumPhotoPage({ params }: { params: Params }) {
  'use cache';
  
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const albumSlug = resolvedParams?.albumSlug || '';
  const photoId = resolvedParams?.photoId || '';

  // Apply cache settings
  cacheLife('max');
  cacheTag('albums');
  cacheTag(`profile-${nickname}`);

  if (!nickname || !albumSlug || !photoId) {
    notFound();
  }

  // Use cached function
  const result = await getAlbumPhotoByShortId(nickname, albumSlug, photoId);

  if (!result) {
    notFound();
  }

  return (
    <PhotoPageContent
      photo={result.photo}
      profile={result.profile}
      currentAlbum={result.currentAlbum}
      albums={result.albums}
    />
  );
}
