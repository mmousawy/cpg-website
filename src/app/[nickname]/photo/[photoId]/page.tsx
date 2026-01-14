import { cacheLife, cacheTag } from 'next/cache';
import PhotoPageContent from '@/components/photo/PhotoPageContent';
import { getPhotoByShortId } from '@/lib/data/profiles';
import { notFound } from 'next/navigation';

type Params = Promise<{
  nickname: string;
  photoId: string;
}>;

// Required for build-time validation with cacheComponents
export async function generateStaticParams() {
  return [{ nickname: 'sample', photoId: 'sample' }];
}

export async function generateMetadata({ params }: { params: Params }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const photoId = resolvedParams?.photoId || '';

  if (!nickname || !photoId) {
    return { title: 'Photo Not Found' };
  }

  // Use cached function
  const result = await getPhotoByShortId(nickname, photoId);

  if (!result) {
    return { title: 'Photo Not Found' };
  }

  return {
    title: `${result.photo.title || 'Photo'} by @${nickname}`,
    description: result.photo.description || `Photo by @${nickname}`,
  };
}

export default async function PhotoPage({ params }: { params: Params }) {
  'use cache';

  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const photoId = resolvedParams?.photoId || '';

  // Apply cache settings after extracting params
  cacheLife('max');
  cacheTag(`profile-${nickname}`);

  if (!nickname || !photoId) {
    notFound();
  }

  // Use cached function
  const result = await getPhotoByShortId(nickname, photoId);

  if (!result) {
    notFound();
  }

  return (
    <PhotoPageContent
      photo={result.photo}
      profile={result.profile}
      albums={result.albums}
    />
  );
}
