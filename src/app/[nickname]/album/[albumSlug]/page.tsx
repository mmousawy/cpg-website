import { getAlbumBySlug } from '@/lib/data/albums';
import { notFound } from 'next/navigation';
import AlbumContent from './AlbumContent';

// Required for build-time validation with cacheComponents
export async function generateStaticParams() {
  return [{ nickname: 'sample', albumSlug: 'sample' }];
}

export async function generateMetadata({ params }: { params: Promise<{ nickname: string; albumSlug: string }> }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const albumSlug = resolvedParams?.albumSlug || '';

  if (!nickname || !albumSlug) {
    return {
      title: 'Album Not Found',
    };
  }

  const album = await getAlbumBySlug(nickname, albumSlug);

  if (!album) {
    return {
      title: 'Album Not Found',
    };
  }

  return {
    title: `${album.title} by @${nickname}`,
    description: album.description || `Photo album "${album.title}" by @${nickname}`,
  };
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
    notFound();
  }

  // Pass album data to cached content component
  return <AlbumContent album={album} nickname={nickname} albumSlug={albumSlug} />;
}
