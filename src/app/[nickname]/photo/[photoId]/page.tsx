import PhotoPageContent from '@/components/photo/PhotoPageContent';
import JsonLd from '@/components/shared/JsonLd';
import { getPhotoByShortId } from '@/lib/data/profiles';
import { createMetadata, getAbsoluteUrl, siteConfig } from '@/utils/metadata';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

type Params = Promise<{
  nickname: string;
  photoId: string;
}>;

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

  // Use cached function
  const result = await getPhotoByShortId(nickname, photoId);

  if (!result) {
    return createMetadata({
      title: 'Photo Not Found',
      description: 'The requested photo could not be found',
    });
  }

  const photoTitle = `${result.photo.title || 'Photo'} by @${nickname}`;
  const photoDescription = result.photo.description || `Photo by @${nickname}`;
  const photoImage = result.photo.url || null;

  return createMetadata({
    title: photoTitle,
    description: photoDescription,
    image: photoImage,
    canonical: `/@${encodeURIComponent(nickname)}/photo/${encodeURIComponent(photoId)}`,
    type: 'article',
    keywords: ['photography', 'photo', result.photo.title || '', nickname],
  });
}

export default async function PhotoPage({ params }: { params: Params }) {
  'use cache';

  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const photoId = resolvedParams?.photoId || '';

  if (!nickname || !photoId) {
    notFound();
  }

  cacheLife('max');
  cacheTag(`profile-${nickname}`);
  cacheTag(`photo-${photoId}`);

  const result = await getPhotoByShortId(nickname, photoId);

  if (!result) {
    notFound();
  }

  const photoUrl = getAbsoluteUrl(`/@${encodeURIComponent(nickname)}/photo/${encodeURIComponent(result.photo.short_id || '')}`);
  const profileUrl = getAbsoluteUrl(`/@${encodeURIComponent(nickname)}`);

  const imageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: result.photo.title || 'Photo',
    description: result.photo.description || `Photo by @${nickname}`,
    contentUrl: result.photo.url,
    url: photoUrl,
    creator: {
      '@type': 'Person',
      name: result.profile.full_name || `@${nickname}`,
      url: profileUrl,
    },
    ...(result.photo.created_at && { dateCreated: result.photo.created_at }),
  };

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
      <PhotoPageContent
        photo={result.photo}
        profile={result.profile}
        albums={result.albums}
        challenges={result.challenges}
      />
    </>
  );
}
