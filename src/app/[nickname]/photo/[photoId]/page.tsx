import { PhotoLightboxColumn } from '@/components/photo/PhotoPageContent';
import { cacheLife, cacheTag } from 'next/cache';

import JsonLd from '@/components/shared/JsonLd';
import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getPhotoByShortId, getProfileSiblingPhotos } from '@/lib/data/profiles';
import { buildImageObjectJsonLd } from '@/lib/photos/jsonLd';
import { createMetadata, formatPhotoPageTitle, formatProfileDisplayName, getAbsoluteUrl, getSocialImageUrl, siteConfig } from '@/utils/metadata';
import { notFound } from 'next/navigation';

type Params = Promise<{
  nickname: string;
  photoId: string;
}>;

type PhotoPageResult = NonNullable<Awaited<ReturnType<typeof getPhotoByShortId>>>;
type SiblingPhotos = NonNullable<Awaited<ReturnType<typeof getProfileSiblingPhotos>>>;

// Required for build-time validation with cacheComponents
export async function generateStaticParams() {
  return [{ nickname: 'sample', photoId: 'sample' }];
}

export async function generateMetadata({ params }: { params: Params }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const photoId = resolvedParams?.photoId || '';

  if (!nickname || !photoId) {
    return createMetadata({
      title: 'Photo Not Found',
      description: 'The requested photo could not be found',
    });
  }

  const includeTestContent = await getIncludeTestContent();
  const result = await getPhotoByShortId(nickname, photoId, includeTestContent);

  if (!result) {
    return createMetadata({
      title: 'Photo Not Found',
      description: 'The requested photo could not be found',
    });
  }

  const ownerName = formatProfileDisplayName(result.profile.full_name, result.profile.nickname);
  const photoTitle = formatPhotoPageTitle({ ownerName, photoTitle: result.photo.title });
  const photoDescription = result.photo.description || `Photo by @${nickname}`;
  const photoImage = getSocialImageUrl(result.photo.url);

  return createMetadata({
    title: photoTitle,
    description: photoDescription,
    image: photoImage,
    canonical: `/@${encodeURIComponent(nickname)}/photo/${encodeURIComponent(photoId)}`,
    type: 'article',
    keywords: ['photography', 'photo', result.photo.title || '', nickname],
  });
}

// Block until cached data resolves so SSR includes full HTML (no streaming shell)
export const instant = false;

export default async function PhotoPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const photoId = resolvedParams?.photoId || '';

  if (!nickname || !photoId) {
    notFound();
  }

  const includeTestContent = await getIncludeTestContent();
  const [result, siblingPhotos] = await Promise.all([
    getPhotoByShortId(nickname, photoId, includeTestContent),
    getProfileSiblingPhotos(nickname, includeTestContent),
  ]);

  if (!result) {
    notFound();
  }

  return (
    <CachedPhotoPage
      nickname={nickname}
      photoId={photoId}
      result={result}
      siblingPhotos={siblingPhotos ?? []}
    />
  );
}

async function CachedPhotoPage({
  nickname,
  photoId,
  result,
  siblingPhotos,
}: {
  nickname: string;
  photoId: string;
  result: PhotoPageResult;
  siblingPhotos: SiblingPhotos;
}) {
  'use cache';
  cacheLife('tagged');
  cacheTag(`profile-${nickname}`);
  cacheTag(`photo-${photoId}`);

  const photoUrl = getAbsoluteUrl(`/@${encodeURIComponent(nickname)}/photo/${encodeURIComponent(result.photo.short_id || '')}`);
  const profileUrl = getAbsoluteUrl(`/@${encodeURIComponent(nickname)}`);

  const creatorName = result.profile.full_name || `@${nickname}`;
  const imageJsonLd = buildImageObjectJsonLd({
    name: result.photo.title || 'Photo',
    description: result.photo.description || `Photo by @${nickname}`,
    contentUrl: result.photo.url,
    pageUrl: photoUrl,
    creatorNickname: nickname,
    creatorName,
    dateCreated: result.photo.created_at,
    license: result.photo.license,
    copyrightNotice: result.photo.copyright_notice,
  });

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
      { '@type': 'ListItem', position: 2, name: result.profile.full_name || `@${nickname}`, item: profileUrl },
      { '@type': 'ListItem', position: 3, name: result.photo.title || 'Photo', item: photoUrl },
    ],
  };

  return (
    <>
      <JsonLd
        data={[imageJsonLd, breadcrumbJsonLd]}
      />
      <PhotoLightboxColumn
        photo={result.photo}
        isInAlbum={siblingPhotos.length > 1}
        siblingPhotos={siblingPhotos}
        basePath={`/@${nickname}`}
      />
    </>
  );
}
