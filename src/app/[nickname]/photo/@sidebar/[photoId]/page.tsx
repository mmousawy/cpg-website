import { PhotoMetadataColumn } from '@/components/photo/PhotoPageContent';
import { withPhotoMemberTagsHydration } from '@/components/photo/withPhotoMemberTagsHydration';
import { cacheLife, cacheTag } from 'next/cache';

import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getPhotoByShortId } from '@/lib/data/profiles';
import { notFound } from 'next/navigation';

type Params = Promise<{
  nickname: string;
  photoId: string;
}>;

type PhotoPageResult = NonNullable<Awaited<ReturnType<typeof getPhotoByShortId>>>;

export async function generateStaticParams() {
  return [{ nickname: 'sample', photoId: 'sample' }];
}

export const instant = false;

export default async function ProfilePhotoSidebar({ params }: { params: Params }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const photoId = resolvedParams?.photoId || '';

  if (!nickname || !photoId) {
    notFound();
  }

  const includeTestContent = await getIncludeTestContent();
  const result = await getPhotoByShortId(nickname, photoId, includeTestContent);

  if (!result) {
    notFound();
  }

  return withPhotoMemberTagsHydration(
    result.photo.id,
    result.photo.user_id,
    result.memberTags,
    <CachedProfilePhotoSidebar
      nickname={nickname}
      photoId={photoId}
      result={result}
    />,
  );
}

async function CachedProfilePhotoSidebar({
  nickname,
  photoId,
  result,
}: {
  nickname: string;
  photoId: string;
  result: PhotoPageResult;
}) {
  'use cache';
  cacheLife('tagged');
  cacheTag(`profile-${nickname}`);
  cacheTag(`photo-${photoId}`);

  return (
    <PhotoMetadataColumn
      photo={result.photo}
      profile={result.profile}
      albums={result.albums}
      challenges={result.challenges}
      memberTags={result.memberTags}
    />
  );
}
