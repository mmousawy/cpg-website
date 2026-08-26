import { PhotoLightboxColumn } from '@/components/photo/PhotoPageContent';
import { cacheLife, cacheTag } from 'next/cache';

import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getEventPhotoByShortId } from '@/lib/data/albums';
import { createMetadata, formatPhotoPageTitle, formatProfileDisplayName, getSocialImageUrl } from '@/utils/metadata';
import { notFound } from 'next/navigation';

type Params = Promise<{
  eventSlug: string;
  photoId: string;
}>;

type EventPhotoPageResult = NonNullable<Awaited<ReturnType<typeof getEventPhotoByShortId>>>;

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

  const includeTestContent = await getIncludeTestContent();
  const result = await getEventPhotoByShortId(eventSlug, photoId, includeTestContent);

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
    contextTitle: result.currentEvent.title || 'Event',
  });
  const photoDescription = result.photo.description || `Photo from event "${result.currentEvent.title || 'Event'}"`;
  const photoImage = getSocialImageUrl(result.photo.url);

  return createMetadata({
    title: photoTitle,
    description: photoDescription,
    image: photoImage,
    canonical: `/events/${encodeURIComponent(eventSlug)}/photo/${encodeURIComponent(photoId)}`,
    type: 'article',
    keywords: ['photography', 'photo', result.photo.title || '', result.currentEvent.title || ''],
  });
}

// Block until cached data resolves so SSR includes full HTML (no streaming shell)
export const instant = false;

export default async function EventPhotoPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const eventSlug = resolvedParams?.eventSlug || '';
  const photoId = resolvedParams?.photoId || '';

  if (!eventSlug || !photoId) {
    notFound();
  }

  const includeTestContent = await getIncludeTestContent();
  const result = await getEventPhotoByShortId(eventSlug, photoId, includeTestContent);

  if (!result) {
    notFound();
  }

  return (
    <CachedEventPhotoPage
      eventSlug={eventSlug}
      photoId={photoId}
      result={result}
    />
  );
}

async function CachedEventPhotoPage({
  eventSlug,
  photoId,
  result,
}: {
  eventSlug: string;
  photoId: string;
  result: EventPhotoPageResult;
}) {
  'use cache';
  cacheLife('tagged');
  cacheTag('albums');
  cacheTag('events');
  cacheTag(`photo-${photoId}`);

  return (
    <PhotoLightboxColumn
      photo={result.photo}
      isInAlbum
      siblingPhotos={result.siblingPhotos}
      basePath={`/events/${eventSlug}`}
    />
  );
}
