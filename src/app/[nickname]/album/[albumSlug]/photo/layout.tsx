import PhotoFilmstripShell from '@/components/photo/PhotoFilmstripShell';
import ScrollToTopOnRouteChange from '@/components/shared/ScrollToTopOnRouteChange';
import { getAlbumSiblingPhotos } from '@/lib/data/profiles';

type LayoutParams = Promise<{
  nickname: string;
  albumSlug: string;
}>;

export default async function AlbumPhotoCollectionLayout({
  children,
  sidebar,
  params,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  params: LayoutParams;
}) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const albumSlug = resolvedParams?.albumSlug || '';

  const siblingPhotos = nickname && albumSlug
    ? await getAlbumSiblingPhotos(nickname, albumSlug)
    : null;

  return (
    <>
      <ScrollToTopOnRouteChange />
      <PhotoFilmstripShell
        siblingPhotos={siblingPhotos ?? []}
        nickname={nickname}
        albumSlug={albumSlug}
        sidebar={sidebar}
      >
        {children}
      </PhotoFilmstripShell>
    </>
  );
}
