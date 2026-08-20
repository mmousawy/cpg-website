import PhotoFilmstripShell from '@/components/photo/PhotoFilmstripShell';
import ScrollToTopOnRouteChange from '@/components/shared/ScrollToTopOnRouteChange';
import { getEventSiblingPhotos } from '@/lib/data/albums';

type LayoutParams = Promise<{
  eventSlug: string;
}>;

export default async function EventPhotoCollectionLayout({
  children,
  sidebar,
  params,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  params: LayoutParams;
}) {
  const resolvedParams = await params;
  const eventSlug = resolvedParams?.eventSlug || '';

  const siblingPhotos = eventSlug
    ? await getEventSiblingPhotos(eventSlug)
    : null;

  return (
    <>
      <ScrollToTopOnRouteChange />
      <PhotoFilmstripShell
        siblingPhotos={siblingPhotos ?? []}
        basePath={eventSlug ? `/events/${eventSlug}` : undefined}
        sidebar={sidebar}
      >
        {children}
      </PhotoFilmstripShell>
    </>
  );
}
