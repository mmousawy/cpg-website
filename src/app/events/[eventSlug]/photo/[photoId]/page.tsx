import PhotoPageContent from '@/components/photo/PhotoPageContent';
import ScrollToTopOnRouteChange from '@/components/shared/ScrollToTopOnRouteChange';
import { getEventPhotoByShortId } from '@/lib/data/albums';
import { createMetadata, getSocialImageUrl } from '@/utils/metadata';
import { notFound } from 'next/navigation';

type Params = Promise<{
  eventSlug: string;
  photoId: string;
}>;

// Required for build-time validation with cacheComponents
export async function generateStaticParams() {
  return [{ eventSlug: 'sample', photoId: 'sample' }];
}

export async function generateMetadata({ params }: { params: Params }) {
  const resolvedParams = await params;
  const eventSlug = resolvedParams?.eventSlug || '';
  const photoId = resolvedParams?.photoId || '';

  if (!eventSlug || !photoId) {
    return createMetadata({
      title: 'Photo Not Found',
      description: 'The requested photo could not be found',
    });
  }

  const result = await getEventPhotoByShortId(eventSlug, photoId);

  if (!result) {
    return createMetadata({
      title: 'Photo Not Found',
      description: 'The requested photo could not be found',
    });
  }

  const eventTitle = result.currentEvent.title || 'Event';
  const photoTitle = `${result.photo.title || 'Photo'} - ${eventTitle}`;
  const photoDescription = result.photo.description || `Photo from event "${eventTitle}"`;
  const photoImage = getSocialImageUrl(result.photo.url);

  return createMetadata({
    title: photoTitle,
    description: photoDescription,
    image: photoImage,
    canonical: `/events/${encodeURIComponent(eventSlug)}/photo/${encodeURIComponent(photoId)}`,
    type: 'article',
    keywords: ['photography', 'photo', result.photo.title || '', eventTitle],
  });
}

export default async function EventPhotoPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const eventSlug = resolvedParams?.eventSlug || '';
  const photoId = resolvedParams?.photoId || '';

  if (!eventSlug || !photoId) {
    notFound();
  }

  const result = await getEventPhotoByShortId(eventSlug, photoId);

  if (!result) {
    notFound();
  }

  return (
    <>
      <ScrollToTopOnRouteChange />
      <PhotoPageContent
        photo={result.photo}
        profile={result.profile}
        albums={result.albums}
        challenges={result.challenges}
        currentEvent={result.currentEvent}
        siblingPhotos={result.siblingPhotos}
      />
    </>
  );
}
