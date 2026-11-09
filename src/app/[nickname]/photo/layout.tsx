import PhotoFilmstripShell from '@/components/photo/PhotoFilmstripShell';
import ScrollToTopOnRouteChange from '@/components/shared/ScrollToTopOnRouteChange';
import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getProfileSiblingPhotos } from '@/lib/data/profiles';

type LayoutParams = Promise<{
  nickname: string;
}>;

export default async function ProfilePhotoCollectionLayout({
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

  const includeTestContent = await getIncludeTestContent();
  const siblingPhotos = nickname
    ? await getProfileSiblingPhotos(nickname, includeTestContent)
    : null;

  return (
    <>
      <ScrollToTopOnRouteChange />
      <PhotoFilmstripShell
        siblingPhotos={siblingPhotos ?? []}
        basePath={nickname ? `/@${nickname}` : undefined}
        sidebar={sidebar}
      >
        {children}
      </PhotoFilmstripShell>
    </>
  );
}
