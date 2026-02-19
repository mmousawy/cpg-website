import ViewTracker from '@/components/shared/ViewTracker';
import { getAlbumBySlug, getAllAlbumPaths } from '@/lib/data/albums';
import { createMetadata } from '@/utils/metadata';
import { notFound } from 'next/navigation';
import AlbumContent from './AlbumContent';

// Pre-render all public albums at build time for optimal caching
export async function generateStaticParams() {
  const paths = await getAllAlbumPaths();
  return paths;
}

export async function generateMetadata({ params }: { params: Promise<{ nickname: string; albumSlug: string }> }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const albumSlug = resolvedParams?.albumSlug || '';

  if (!nickname || !albumSlug) {
    return createMetadata({
      title: 'Album Not Found',
      description: 'The requested album could not be found',
    });
  }

  const album = await getAlbumBySlug(nickname, albumSlug);

  if (!album) {
    return createMetadata({
      title: 'Album Not Found',
      description: 'The requested album could not be found',
    });
  }

  const albumTitle = `${album.title} by @${nickname}`;
  const albumDescription = album.description || `Photo album "${album.title}" by @${nickname}`;

  // Get first photo from album (sorted by sort_order) for og:image
  type AlbumWithPhotosType = {
    photos?: Array<{ photo_url: string; sort_order?: number | null }>;
  };
  const albumWithPhotos = album as AlbumWithPhotosType;
  const photos = albumWithPhotos.photos || [];
  const sortedPhotos = [...photos].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const firstPhoto = sortedPhotos.length > 0 ? sortedPhotos[0] : null;
  const albumImage = firstPhoto?.photo_url || null;

  return createMetadata({
    title: albumTitle,
    description: albumDescription,
    image: albumImage,
    canonical: `/${encodeURIComponent(nickname)}/album/${encodeURIComponent(albumSlug)}`,
    type: 'article',
    keywords: ['photo album', 'photography', album.title, nickname],
  });
}

// Page fetches album OUTSIDE cache to handle 404 properly
export default async function PublicAlbumPage({ params }: { params: Promise<{ nickname: string; albumSlug: string }> }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const albumSlug = resolvedParams?.albumSlug || '';

  if (!nickname || !albumSlug) {
    notFound();
  }

  // Fetch album outside cache to handle 404
  const album = await getAlbumBySlug(nickname, albumSlug);

  if (!album) {
    // Log for debugging
    console.error(`Album not found: nickname=${nickname}, albumSlug=${albumSlug}`);
    notFound();
  }

  return (
    <>
      <ViewTracker
        type="album"
        id={album.id}
      />
      <AlbumContent
        album={album}
        nickname={nickname}
        albumSlug={albumSlug}
      />
    </>
  );
}
