import { PhotoMetadataColumn } from '@/components/photo/PhotoPageContent';
import { cacheLife, cacheTag } from 'next/cache';

import { getAlbumPhotoByShortId } from '@/lib/data/profiles';
import { notFound } from 'next/navigation';

type Params = Promise<{
  nickname: string;
  albumSlug: string;
  photoId: string;
}>;

type AlbumPhotoPageResult = NonNullable<Awaited<ReturnType<typeof getAlbumPhotoByShortId>>>;

export async function generateStaticParams() {
  return [{ nickname: 'sample', albumSlug: 'sample', photoId: 'sample' }];
}

export const instant = false;

export default async function AlbumPhotoSidebar({ params }: { params: Params }) {
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
    <CachedAlbumPhotoSidebar
      nickname={nickname}
      photoId={photoId}
      result={result}
    />
  );
}

async function CachedAlbumPhotoSidebar({
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
    <PhotoMetadataColumn
      photo={result.photo}
      profile={result.profile}
      albumOwnerNickname={result.albumOwnerNickname}
      currentAlbum={result.currentAlbum}
      albums={result.albums}
      challenges={result.challenges}
      tightTopMargin
    />
  );
}
