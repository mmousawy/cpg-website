import PhotoPageContent from '@/components/photo/PhotoPageContent';
import { getChallengePhotoByShortId } from '@/lib/data/challenges';
import { createMetadata } from '@/utils/metadata';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

type Params = Promise<{
  slug: string;
  photoId: string;
}>;

// Required for build-time validation with cacheComponents
export async function generateStaticParams() {
  return [{ slug: 'sample', photoId: 'sample' }];
}

export async function generateMetadata({ params }: { params: Params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || '';
  const photoId = resolvedParams?.photoId || '';

  if (!slug || !photoId) {
    return createMetadata({
      title: 'Photo Not Found',
      description: 'The requested photo could not be found',
    });
  }

  const result = await getChallengePhotoByShortId(slug, photoId);

  if (!result) {
    return createMetadata({
      title: 'Photo Not Found',
      description: 'The requested photo could not be found',
    });
  }

  const photoTitle = `${result.photo.title || 'Photo'} - ${result.currentChallenge.title}`;
  const photoDescription = result.photo.description || `Photo from challenge "${result.currentChallenge.title}"`;
  const photoImage = result.photo.url || null;

  return createMetadata({
    title: photoTitle,
    description: photoDescription,
    image: photoImage,
    canonical: `/challenges/${encodeURIComponent(slug)}/photo/${encodeURIComponent(photoId)}`,
    type: 'article',
    keywords: ['photography', 'photo', result.photo.title || '', result.currentChallenge.title],
  });
}

// Fetch data OUTSIDE cache to handle 404 properly
export default async function ChallengePhotoPage({ params }: { params: Params }) {
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
    <CachedChallengePhotoContent
      result={result}
    />
  );
}

// Separate cached component for the content
async function CachedChallengePhotoContent({
  result,
}: {
  result: NonNullable<Awaited<ReturnType<typeof getChallengePhotoByShortId>>>;
}) {
  'use cache';

  cacheLife('max');
  cacheTag('challenge-photos');
  cacheTag(`challenge-photos-${result.currentChallenge.slug}`);
  cacheTag(`photo-${result.photo.short_id}`);

  return (
    <PhotoPageContent
      photo={result.photo}
      profile={result.profile}
      albums={result.albums}
      challenges={result.challenges}
      currentChallenge={result.currentChallenge}
      siblingPhotos={result.siblingPhotos}
    />
  );
}
