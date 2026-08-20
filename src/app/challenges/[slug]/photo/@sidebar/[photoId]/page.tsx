import { PhotoMetadataColumn } from '@/components/photo/PhotoPageContent';
import { cacheLife, cacheTag } from 'next/cache';

import { getChallengePhotoByShortId } from '@/lib/data/challenges';
import { notFound } from 'next/navigation';

type Params = Promise<{
  slug: string;
  photoId: string;
}>;

type ChallengePhotoPageResult = NonNullable<Awaited<ReturnType<typeof getChallengePhotoByShortId>>>;

export async function generateStaticParams() {
  return [{ slug: 'sample', photoId: 'sample' }];
}

export const instant = false;

export default async function ChallengePhotoSidebar({ params }: { params: Params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || '';
  const photoId = resolvedParams?.photoId || '';

  if (!slug || !photoId) {
    notFound();
  }

  const result = await getChallengePhotoByShortId(slug, photoId);

  if (!result) {
    notFound();
  }

  return (
    <CachedChallengePhotoSidebar
      slug={slug}
      photoId={photoId}
      result={result}
    />
  );
}

async function CachedChallengePhotoSidebar({
  slug,
  photoId,
  result,
}: {
  slug: string;
  photoId: string;
  result: ChallengePhotoPageResult;
}) {
  'use cache';
  cacheLife('tagged');
  cacheTag('challenge-photos');
  cacheTag(`challenge-photos-${slug}`);
  cacheTag(`photo-${photoId}`);

  return (
    <PhotoMetadataColumn
      photo={result.photo}
      profile={result.profile}
      albums={result.albums}
      challenges={result.challenges}
      currentChallenge={result.currentChallenge}
      tightTopMargin
    />
  );
}
