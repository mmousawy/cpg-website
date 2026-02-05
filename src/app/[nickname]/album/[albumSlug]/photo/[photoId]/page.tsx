import PhotoPageContent from '@/components/photo/PhotoPageContent';
import { getAlbumPhotoByShortId } from '@/lib/data/profiles';
import { createMetadata } from '@/utils/metadata';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

type Params = Promise<{
  nickname: string;
  albumSlug: string;
  photoId: string;
}>;

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

  // Use cached function
  const result = await getAlbumPhotoByShortId(nickname, albumSlug, photoId);

  if (!result) {
    return createMetadata({
      title: 'Photo Not Found',
      description: 'The requested photo could not be found',
    });
  }

  const photoTitle = `${result.photo.title || 'Photo'} - ${result.currentAlbum.title} by @${nickname}`;
  const photoDescription = result.photo.description || `Photo from album "${result.currentAlbum.title}" by @${nickname}`;
  const photoImage = result.photo.url || null;

  return createMetadata({
    title: photoTitle,
    description: photoDescription,
    image: photoImage,
    canonical: `/${encodeURIComponent(nickname)}/album/${encodeURIComponent(albumSlug)}/photo/${encodeURIComponent(photoId)}`,
    type: 'article',
    keywords: ['photography', 'photo', result.photo.title || '', result.currentAlbum.title, nickname],
  });
}

// Fetch data OUTSIDE cache to handle 404 properly
export default async function AlbumPhotoPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const albumSlug = resolvedParams?.albumSlug || '';
  const photoId = resolvedParams?.photoId || '';

  if (!nickname || !albumSlug || !photoId) {
    notFound();
  }

  // Fetch data outside cache to handle 404
  const result = await getAlbumPhotoByShortId(nickname, albumSlug, photoId);

  if (!result) {
    notFound();
  }

  // Pass to cached content component
  return <CachedAlbumPhotoContent
    result={result}
    nickname={nickname}
  />;
}

// Separate cached component for the content
async function CachedAlbumPhotoContent({
  result,
  nickname,
}: {
  result: NonNullable<Awaited<ReturnType<typeof getAlbumPhotoByShortId>>>;
  nickname: string;
}) {
  'use cache';

  cacheLife('max');
  cacheTag('albums');
  cacheTag(`profile-${nickname}`);

  return (
    <PhotoPageContent
      photo={result.photo}
      profile={result.profile}
      currentAlbum={result.currentAlbum}
      albums={result.albums}
      challenges={result.challenges}
    />
  );
}
