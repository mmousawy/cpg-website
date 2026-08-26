import PhotoFilmstripShell from '@/components/photo/PhotoFilmstripShell';
import ScrollToTopOnRouteChange from '@/components/shared/ScrollToTopOnRouteChange';
import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getChallengeSiblingPhotos } from '@/lib/data/challenges';

type LayoutParams = Promise<{
  slug: string;
}>;

export default async function ChallengePhotoCollectionLayout({
  children,
  sidebar,
  params,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  params: LayoutParams;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || '';

  const includeTestContent = await getIncludeTestContent();
  const siblingPhotos = slug
    ? await getChallengeSiblingPhotos(slug, includeTestContent)
    : null;

  return (
    <>
      <ScrollToTopOnRouteChange />
      <PhotoFilmstripShell
        siblingPhotos={siblingPhotos ?? []}
        basePath={slug ? `/challenges/${slug}` : undefined}
        sidebar={sidebar}
      >
        {children}
      </PhotoFilmstripShell>
    </>
  );
}
