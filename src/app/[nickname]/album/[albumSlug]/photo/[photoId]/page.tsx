import PhotoPageContent from '@/components/photo/PhotoPageContent';
import { cacheLife, cacheTag } from 'next/cache';

import { getAlbumPhotoByShortId } from '@/lib/data/profiles';
import { createMetadata, formatPhotoPageTitle, formatProfileDisplayName, getSocialImageUrl } from '@/utils/metadata';
import { notFound } from 'next/navigation';

type Params = Promise<{
  nickname: string;
  albumSlug: string;
  photoId: string;
}>;

type AlbumPhotoPageResult = NonNullable<Awaited<ReturnType<typeof getAlbumPhotoByShortId>>>;

// Required for build-time validation with cacheComponents
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
    return createMetadata({
      title: 'Photo Not Found',
      description: 'The requested photo could not be found',
    });
  }

  const result = await getAlbumPhotoByShortId(nickname, albumSlug, photoId);

  if (!result) {
    return createMetadata({
      title: 'Photo Not Found',
      description: 'The requested photo could not be found',
    });
  }

  const ownerName = formatProfileDisplayName(result.profile.full_name, result.profile.nickname);
  const photoTitle = formatPhotoPageTitle({
    ownerName,
    photoTitle: result.photo.title,
    contextTitle: result.currentAlbum.title,
  });
  const photoDescription = result.photo.description || `Photo from album "${result.currentAlbum.title}" by @${nickname}`;
  const photoImage = getSocialImageUrl(result.photo.url);

  return createMetadata({
    title: photoTitle,
    description: photoDescription,
    image: photoImage,
    canonical: `/@${encodeURIComponent(nickname)}/album/${encodeURIComponent(albumSlug)}/photo/${encodeURIComponent(photoId)}`,
    type: 'article',
    keywords: ['photography', 'photo', result.photo.title || '', result.currentAlbum.title, nickname],
  });
}

// Block until cached data resolves so SSR includes full HTML (no streaming shell)
export const instant = false;

export default async function AlbumPhotoPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const albumSlug = resolvedParams?.albumSlug || '';
  const photoId = resolvedParams?.photoId || '';

  if (!nickname || !albumSlug || !photoId) {
    notFound();
  }

  const result = await getAlbumPhotoByShortId(nickname, albumSlug, photoId);

  if (!result) {
    notFound();
  }

  return (
    <CachedAlbumPhotoPage
      nickname={nickname}
      photoId={photoId}
      result={result}
    />
  );
}

async function CachedAlbumPhotoPage({
  nickname,
  photoId,
  result,
}: {
  nickname: string;
  photoId: string;
  result: AlbumPhotoPageResult;
}) {
  'use cache';
  cacheLife('tagged');
  cacheTag(`profile-${nickname}`);
  cacheTag('albums');
  cacheTag(`photo-${photoId}`);

  return (
    <PhotoPageContent
      photo={result.photo}
      profile={result.profile}
      albumOwnerNickname={result.albumOwnerNickname}
      currentAlbum={result.currentAlbum}
      albums={result.albums}
      challenges={result.challenges}
      siblingPhotos={result.siblingPhotos}
    />
  );
}
