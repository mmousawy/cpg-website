import { getAlbumBySlug } from '@/lib/data/albums';
import { notFound } from 'next/navigation';
import AlbumContent from './AlbumContent';

// Provide sample params for build-time validation
// This allows awaiting params directly without Suspense warning
export async function generateStaticParams() {
  // Return at least one sample path for build-time validation
  // This is required when using Cache Components
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

export default async function PublicAlbumPage({ params }: { params: Promise<{ nickname: string; albumSlug: string }> }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const albumSlug = resolvedParams?.albumSlug || '';

  if (!nickname || !albumSlug) {
    notFound();
  }

  return <AlbumContent nickname={nickname} albumSlug={albumSlug} />;
}
