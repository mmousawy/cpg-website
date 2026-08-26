import { PhotoMetadataColumn } from '@/components/photo/PhotoPageContent';
import { cacheLife, cacheTag } from 'next/cache';

import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getEventPhotoByShortId } from '@/lib/data/albums';
import { notFound } from 'next/navigation';

type Params = Promise<{
  eventSlug: string;
  photoId: string;
}>;

type EventPhotoPageResult = NonNullable<Awaited<ReturnType<typeof getEventPhotoByShortId>>>;

export async function generateStaticParams() {
  return [{ eventSlug: 'sample', photoId: 'sample' }];
}

export const instant = false;

export default async function EventPhotoSidebar({ params }: { params: Params }) {
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
    <CachedEventPhotoSidebar
      photoId={photoId}
      result={result}
    />
  );
}

async function CachedEventPhotoSidebar({
  photoId,
  result,
}: {
  photoId: string;
  result: EventPhotoPageResult;
}) {
  'use cache';
  cacheLife('tagged');
  cacheTag('albums');
  cacheTag('events');
  cacheTag(`photo-${photoId}`);

  return (
    <PhotoMetadataColumn
      photo={result.photo}
      profile={result.profile}
      albums={result.albums}
      challenges={result.challenges}
      currentEvent={result.currentEvent}
    />
  );
}
